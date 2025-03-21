// components/DocumentVerification.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/app/lib/TranslationContext";

interface VerificationResult {
  isValid: boolean;
  confidenceScore: number;
  documentType: string;
  errors?: string[];
}

interface Document {
  _id?: string;
  type: string;
  file: File | null;
  status: 'pending' | 'verifying' | 'verified' | 'failed';
  result?: VerificationResult;
  isStored?: boolean;
  uploadProgress?: number;
}

const DOCUMENT_TYPES = [
  'Aadhar Card',
  'PAN Card',
  'Caste Certificate',
  'Ration Card',
  'Voter ID',
  'Driving License',
  'Income Certificate',
  'Disability Certificate',
  'Birth Certificate',
  'Marriage Certificate',
  'Bank Passbook',
  'Employment Certificate',
  'Educational Certificates',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentVerification() {
  const [isMounted, setIsMounted] = useState(false);
  const [documents, setDocuments] = useState<Document[]>(
    DOCUMENT_TYPES.map(type => ({
      type,
      file: null,
      status: 'pending'
    }))
  );
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem('token');
    setAuthToken(token);
    
    if (token) {
      fetchUserDocuments(token);
    }
  }, []);

  const fetchUserDocuments = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/documents/my-documents', {
        headers: {
          'x-auth-token': token
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const existingDocs = await response.json();
      
      setDocuments(prev => prev.map(doc => {
        const existingDoc = existingDocs.find((ed: any) => ed.documentType === doc.type);
        return existingDoc ? {
          ...doc,
          _id: existingDoc._id,
          status: existingDoc.isVerified ? 'verified' : 'failed',
          isStored: true,
          result: {
            isValid: existingDoc.isVerified,
            confidenceScore: existingDoc.verificationDetails?.confidenceScore || 0,
            documentType: existingDoc.documentType,
            errors: existingDoc.verificationDetails?.errors || []
          }
        } : doc;
      }));
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your documents",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (type: string, file: File) => {
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size should be less than 10MB');
      }

      setDocuments(prev => prev.map(doc => 
        doc.type === type 
          ? { ...doc, file, status: 'verifying', uploadProgress: 0 }
          : doc
      ));

      // First verify the document
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', type);

      const verifyResponse = await fetch('http://localhost:5000/verify', {
        method: 'POST',
        body: formData,
      });

      if (!verifyResponse.ok) {
        throw new Error(t("VerificationFailed"));
      }

      const verificationResult = await verifyResponse.json();
      const transformedResult: VerificationResult = {
        isValid: verificationResult.isValid,
        confidenceScore: verificationResult.confidenceScore || 0,
        documentType: verificationResult.documentType,
        errors: verificationResult.errors || []
      };

      // If verification successful, store the document
      if (transformedResult.isValid && authToken) {
        const uploadFormData = new FormData();
        uploadFormData.append('document', file);
        uploadFormData.append('documentType', type);
        uploadFormData.append('verificationResult', JSON.stringify(transformedResult));

        const uploadResponse = await fetch('http://localhost:3000/api/documents/upload', {
          method: 'POST',
          headers: {
            'x-auth-token': authToken
          },
          body: uploadFormData
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to store document');
        }

        const storedDoc = await uploadResponse.json();

        setDocuments(prev => prev.map(doc => 
          doc.type === type 
            ? { 
                ...doc, 
                _id: storedDoc._id,
                status: 'verified',
                result: transformedResult,
                isStored: true,
                uploadProgress: 100
              }
            : doc
        ));

        toast({
          title: "Success",
          description: "Document verified and stored successfully",
          variant: "default"
        });
      } else {
        setDocuments(prev => prev.map(doc => 
          doc.type === type 
            ? { 
                ...doc, 
                status: 'failed',
                result: transformedResult,
                uploadProgress: undefined
              }
            : doc
        ));

        if (!transformedResult.isValid) {
          toast({
            title: t("VerificationFailed"),
            description: transformedResult.errors?.[0] || t("Documentverificationfailed"),
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setDocuments(prev => prev.map(doc => 
        doc.type === type 
          ? { 
              ...doc, 
              status: 'failed',
              result: { 
                isValid: false, 
                confidenceScore: 0,
                documentType: type,
                errors: [errorMessage]
              },
              uploadProgress: undefined
            }
          : doc
      ));

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDeleteDocument = async (docId: string, type: string) => {
    if (!authToken || !docId) return;

    try {
      const response = await fetch(`http://localhost:3000/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': authToken
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      setDocuments(prev => prev.map(doc => 
        doc.type === type 
          ? { type, file: null, status: 'pending', isStored: false }
          : doc
      ));

      toast({
        title: "Success",
        description: "Document deleted successfully",
        variant: "default"
      });

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  if (!isMounted) return null;
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">{t("DocumentVerification")}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <Card key={doc.type}>
            <CardHeader>
              <CardTitle>{t(doc.type)}</CardTitle>
              <CardDescription>
                {doc.status === 'pending' && t("DocumentVerificationdesc")}
                {doc.status === 'verifying' && t("Verifying")}
                {doc.status === 'verified' && t("VerificationSuccessful")}
                {doc.status === 'failed' && t("VerificationFailed")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type !== 'application/pdf') {
                        toast({
                          title: "Error",
                          description: "Please upload only PDF files",
                          variant: "destructive"
                        });
                        e.target.value = '';
                        return;
                      }
                      handleFileUpload(doc.type, file);
                    }
                  }}
                  className="hidden"
                  id={`file-${doc.type}`}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={() => document.getElementById(`file-${doc.type}`)?.click()}
                    disabled={doc.status === 'verifying'}
                    variant={doc.status === 'verified' ? 'outline' : 'default'}
                  >
                    {doc.file ? t("replacedocument") : t("uploaddocument")}
                  </Button>

                  {doc.isStored && (
                    <Button
                      variant="destructive"
                      onClick={() => doc._id && handleDeleteDocument(doc._id, doc.type)}
                    >
                      {t("delete")}
                    </Button>
                  )}
                </div>

                {doc.status === 'verifying' && (
                  <div className="space-y-2">
                    <Progress 
                      value={doc.uploadProgress || 45} 
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500">{t("Processingdocument")}</p>
                  </div>
                )}

                {doc.result && (
                  <div className="text-sm space-y-2">
                    <p className={`font-medium ${doc.result.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {doc.result.isValid ? t("VerificationSuccessful") : t("VerificationFailed")}
                    </p>
                    <p>{t("Confidence")}: {Math.round(doc.result.confidenceScore * 100)}%</p>
                    
                    {doc.result.errors && doc.result.errors.length > 0 && (
                      <div className="bg-red-50 p-2 rounded">
                        {doc.result.errors.map((error: string, index: number) => (
                          <p key={index} className="text-red-600 text-xs">{error}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}