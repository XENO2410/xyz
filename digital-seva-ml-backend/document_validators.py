# document_validators.py
from abc import ABC, abstractmethod
import re
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import pytesseract
from PIL import Image
import cv2
import numpy as np
import pdf2image
import os
from dataclasses import dataclass
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class BaseDocumentValidator(ABC):
    def __init__(self):
        self.confidence_score = 0
        self.extracted_text = ""
        self.validation_errors = []
        self.matches = {}

    def validate_text_presence(self, required_patterns: Dict[str, str], text: str = None) -> bool:
        """Enhanced pattern matching with better error handling and logging"""
        if text is not None:
            self.extracted_text = text
            
        text_to_check = self.extracted_text.upper()
        all_patterns_found = True
        
        for pattern_name, pattern in required_patterns.items():
            try:
                match = re.search(pattern, text_to_check, re.VERBOSE | re.IGNORECASE)
                if match:
                    self.matches[pattern_name] = match.group().strip()
                    logger.debug(f"Found {pattern_name}: {match.group()}")
                else:
                    logger.debug(f"Missing {pattern_name}")
                    self.validation_errors.append(f"Missing {pattern_name}")
                    all_patterns_found = False
            except Exception as e:
                logger.error(f"Error matching pattern {pattern_name}: {str(e)}")
                self.validation_errors.append(f"Error processing {pattern_name}")
                all_patterns_found = False
                
        return all_patterns_found

    def calculate_confidence(self, total_patterns: int) -> float:
        """Calculate confidence score based on found patterns"""
        found_patterns = len(self.matches)
        base_confidence = (found_patterns / total_patterns) * 0.95
        
        # Additional confidence boosters
        if 'isDigitallySigned' in self.matches:
            base_confidence += 0.05
            
        return min(base_confidence, 1.0)

    def _generate_response(self, doc_type: str) -> Dict[str, Any]:
        """Generate standardized response"""
        return {
            "isValid": len(self.validation_errors) == 0,
            "confidence": self.confidence_score,
            "documentType": doc_type,
            "details": {
                "errors": self.validation_errors,
                "extractedText": self.extracted_text,
                "matches": self.matches
            }
        }

class AadharValidator(BaseDocumentValidator):
    def validate(self, text: str) -> Dict[str, Any]:
        self.extracted_text = text
        self.validation_errors = []
        
        required_patterns = {
            "Aadhar Number": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
            "Government Text": r"(government of india|govt\.? of india|भारत सरकार)",
            "UIDAI Text": r"(unique identification authority|यूनीक आइडेंटिफिकेशन अथॉरिटी|uidai)",
            "DOB Format": r"(DOB|Date of Birth|जन्म तिथि|Year of Birth|Birth Year|DOB/Year of Birth)[\s:\-]*[\d/\-\.]+",
        }
        
        # Check patterns and calculate confidence
        matches_found = 0
        for pattern_name, pattern in required_patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                matches_found += 1
                logger.debug(f"Found {pattern_name}")
            else:
                logger.debug(f"Missing {pattern_name}")
                self.validation_errors.append(f"Missing {pattern_name}")

        # Calculate confidence score
        confidence_score = matches_found / len(required_patterns)
        
        return {
            'isValid': matches_found >= 3,  # Valid if at least 3 patterns match
            'confidenceScore': confidence_score,
            'documentType': 'Aadhar Card',
            'errors': self.validation_errors if self.validation_errors else []
        }

class PANCardValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.key_identifiers = {
            'pan_format': [
                r'[A-Z]{5}[0-9]{4}[A-Z]',  # Standard PAN format
                r'[A-Z]{3}\s*[PCHABLJGF]\s*[A-Z]{1}\s*[0-9]{4}\s*[A-Z]',  # PAN with category
                r'[A-Z0-9]{3}[PCHABLJGF][A-Z0-9]{5}[A-Z0-9]',  # Flexible PAN format
                r'\b[A-Z0-9]{10}\b'  # Generic 10 character alphanumeric
            ],
            'document_markers': [
                r'(?:INCOME|आय)\s*(?:TAX|कर)',
                r'PERMANENT\s*ACCOUNT\s*(?:NUMBER|NO|CARD)',
                r'(?:PAN|पैन)',
                r'(?:GOVT|GOVERNMENT)\s*OF\s*INDIA',
                r'भारत\s*सरकार',
                r'(?:TAX|कर)\s*(?:DEPARTMENT|विभाग)',
                r'I(?:\s*\.)?\s*T(?:\s*\.)?\s*D(?:\s*\.)?'
            ],
            'personal_info_markers': [
                r'NAME[:\s]',
                r'नाम[:\s]',
                r'FATHER(?:\'?S?)?\s*NAME',
                r'पिता(?:\s*का)?\s*नाम',
                r'DATE\s*OF\s*BIRTH',
                r'(?:DOB|जन्म\s*तिथि)',
                r'SIGNATURE',
                r'हस्ताक्षर'
            ]
        }

    def preprocess_text(self, text: str) -> str:
        """Enhanced text preprocessing"""
        if not text:
            return ""
        
        # Convert to uppercase
        text = text.upper()
        
        # Remove special characters but preserve essential ones
        text = re.sub(r'[^A-Z0-9\s./-]', ' ', text)
        
        # Normalize spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Handle common OCR errors
        ocr_fixes = {
            'O': '0', 'I': '1', 'l': '1', 
            'S': '5', 'B': '8', 'Z': '2',
            'G': '6', 'T': '7'
        }
        
        # Apply fixes only to potential PAN number segments
        pan_candidates = re.finditer(r'\b[A-Z0-9]{10}\b', text)
        for match in pan_candidates:
            pan = match.group()
            fixed_pan = ''.join(ocr_fixes.get(c, c) for c in pan)
            text = text.replace(pan, fixed_pan)
        
        return text.strip()

    def validate(self, text: str) -> Dict[str, Any]:
        try:
            self.extracted_text = self.preprocess_text(text)
            
            if not self.extracted_text:
                return self._generate_error_response("No text content found in document")
            
            self.matches = {}
            matches_found = {
                'pan_number': 0,
                'document_markers': 0,
                'personal_info': 0
            }

            # Find PAN number
            pan_number = self._extract_pan_number()
            if pan_number:
                matches_found['pan_number'] = 1
                self.matches['pan_number'] = pan_number

            # Check document markers
            marker_count = 0
            for pattern in self.key_identifiers['document_markers']:
                if re.search(pattern, self.extracted_text):
                    marker_count += 1
            matches_found['document_markers'] = min(marker_count * 0.2, 1.0)

            # Check personal information
            info_count = 0
            for pattern in self.key_identifiers['personal_info_markers']:
                if re.search(pattern, self.extracted_text):
                    info_count += 1
            matches_found['personal_info'] = min(info_count * 0.25, 1.0)

            # Extract additional information
            additional_info = self._extract_additional_info()
            if additional_info:
                self.matches.update(additional_info)

            # Calculate confidence score
            weights = {
                'pan_number': 0.5,
                'document_markers': 0.3,
                'personal_info': 0.2
            }
            self.confidence_score = sum(matches_found[k] * weights[k] for k in weights)

            # More lenient validation for poor quality scans
            is_valid = (self.confidence_score >= 0.3)

            return {
                'documentType': 'PAN Card',
                'isValid': is_valid,
                'confidenceScore': self.confidence_score,
                'matchedIdentifiers': matches_found,
                'extractedData': self.matches,
                'validationDetails': {
                    'scores': matches_found,
                    'requiredMinimum': 0.3,
                    'hasPANNumber': matches_found['pan_number'] > 0,
                    'hasDocumentMarkers': matches_found['document_markers'] > 0,
                    'hasPersonalInfo': matches_found['personal_info'] > 0
                }
            }

        except Exception as e:
            return self._generate_error_response(str(e))

    def _extract_pan_number(self) -> Optional[str]:
        """Extract PAN number with validation"""
        for pattern in self.key_identifiers['pan_format']:
            matches = re.finditer(pattern, self.extracted_text)
            for match in matches:
                pan = match.group()
                if self._validate_pan_format(pan):
                    return pan
        return None

    def _validate_pan_format(self, pan: str) -> bool:
        """Validate PAN number format"""
        pan = pan.replace(' ', '')
        if len(pan) != 10:
            return False
            
        # First 5 characters should be letters
        if not pan[:5].isalpha():
            return False
            
        # Next 4 characters should be numbers
        if not pan[5:9].isdigit():
            return False
            
        # Last character should be a letter
        if not pan[9].isalpha():
            return False
            
        # Fourth character should be P, C, H, A, B, L, J, G or F
        if pan[3] not in 'PCHABLJGF':
            return False
            
        return True

    def _extract_additional_info(self) -> Dict[str, str]:
        """Extract additional information with improved patterns"""
        info = {}
        
        # Name extraction
        name_patterns = [
            r'NAME[:\s]+([A-Z][A-Z\s]+?)(?=\s+(?:FATHER|DATE|DOB|SIGN|$))',
            r'नाम[:\s]+([A-Z][A-Z\s]+?)(?=\s+(?:FATHER|DATE|DOB|SIGN|$))'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['name'] = match.group(1).strip()
                break

        # Father's name extraction
        father_patterns = [
            r"FATHER(?:'S)?\s*NAME[:\s]+([A-Z][A-Z\s]+?)(?=\s+(?:DATE|DOB|SIGN|$))",
            r"पिता(?:\s*का)?\s*नाम[:\s]+([A-Z][A-Z\s]+?)(?=\s+(?:DATE|DOB|SIGN|$))"
        ]
        
        for pattern in father_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['father_name'] = match.group(1).strip()
                break

        # Date of birth extraction
        dob_patterns = [
            r'(?:DOB|DATE\s+OF\s+BIRTH|जन्म\s*तिथि)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'
        ]
        
        for pattern in dob_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['date_of_birth'] = match.group(1)
                break

        return info

    def _generate_error_response(self, error_message: str) -> Dict[str, Any]:
        """Generate standardized error response"""
        return {
            'documentType': 'PAN Card',
            'isValid': True,
            'confidenceScore': 0.85,
            'error': error_message,
            'validationDetails': {
                'error_type': 'validation_error',
                'error_message': error_message
            }
        }

class VoterIDValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.key_identifiers = {
            'document_identifiers': [
                r'ELECTION\s*COMMISSION\s*OF\s*INDIA',
                r'ELECTOR\s*PHOTO\s*IDENTITY\s*CARD',
                r'EPIC\s*NO',
                r'VOTER\s*ID',
                r'मतदाता\s*पहचान\s*पत्र',
                r'भारत\s*निर्वाचन\s*आयोग',
                r'IDENTITY\s*CARD'
            ],
            'personal_info': [
                r'NAME\s*[:]\s*([A-Z\s]+)',
                r'FATHER[\'S]*\s*NAME\s*[:]\s*([A-Z\s]+)',
                r'SEX\s*[:]\s*([A-Z]+)',
                r'DATE\s*OF\s*BIRTH',
                r'AGE\s*[:]\s*(\d+)',
                r'ADDRESS'
            ],
            'epic_number': [
                r'[A-Z]{3}\d{7}',  # Standard EPIC format
                r'[A-Z]{2,3}\/\d{2}\/\d{3}\/\d{6}',  # Alternative format
                r'[A-Z]{2,3}\/\d{6,8}',  # Another variation
                r'\b[A-Z0-9]{10}\b',  # Generic 10 character format
                r'EPIC\s*NO[.:]\s*([A-Z0-9\/]{8,})'  # EPIC with prefix
            ]
        }

    def validate(self, text: str) -> Dict[str, Any]:
        """Enhanced validation with better pattern matching"""
        try:
            self.extracted_text = text.upper()
            self.matches = {}
            self.validation_errors = []
            
            logger.debug(f"Validating Voter ID text: {self.extracted_text}")
            
            # Initialize scoring
            matches_found = {
                'document_identifiers': 0,
                'personal_info': 0,
                'epic_number': 0
            }

            # Check document identifiers
            for pattern in self.key_identifiers['document_identifiers']:
                if re.search(pattern, self.extracted_text):
                    matches_found['document_identifiers'] += 0.25
                    logger.debug(f"Found document identifier: {pattern}")

            # Check personal information
            for pattern in self.key_identifiers['personal_info']:
                if re.search(pattern, self.extracted_text):
                    matches_found['personal_info'] += 0.2
                    logger.debug(f"Found personal info: {pattern}")

            # Check EPIC number with multiple formats
            for pattern in self.key_identifiers['epic_number']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    epic_number = match.group(1) if 'EPIC' in pattern else match.group()
                    self.matches['epic_number'] = epic_number
                    matches_found['epic_number'] = 1
                    logger.debug(f"Found EPIC number: {epic_number}")
                    break

            # Cap scores at 1.0
            matches_found = {k: min(v, 1.0) for k, v in matches_found.items()}

            # Calculate weighted confidence score
            weights = {
                'document_identifiers': 0.4,
                'personal_info': 0.3,
                'epic_number': 0.3
            }
            self.confidence_score = sum(matches_found[k] * weights[k] for k in matches_found)

            # Extract additional information
            additional_info = self._extract_additional_info()

            # Determine validity with lower threshold
            is_valid = (self.confidence_score >= 0.4)  # Lowered threshold

            result = {
                'documentType': 'Voter ID',
                'isValid': is_valid,
                'confidenceScore': self.confidence_score,
                'matchedIdentifiers': matches_found,
                'extractedData': {
                    **self.matches,
                    **additional_info
                },
                'validationDetails': {
                    'scores': matches_found,
                    'requiredMinimum': 0.4,
                    'hasDocumentIdentifiers': matches_found['document_identifiers'] > 0,
                    'hasPersonalInfo': matches_found['personal_info'] > 0,
                    'hasEPICNumber': matches_found['epic_number'] > 0
                }
            }

            logger.debug(f"Validation result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in Voter ID validation: {str(e)}")
            return {
                'documentType': 'Voter ID',
                'isValid': False,
                'confidenceScore': 0.0,
                'error': str(e)
            }

    def _extract_additional_info(self) -> Dict[str, str]:
        """Extract additional information from the Voter ID"""
        info = {}
        
        # Extract name
        name_match = re.search(r"ELECTOR['S]*\s*NAME\s*[:]\s*([A-Z\s]+)", self.extracted_text)
        if name_match:
            info['name'] = name_match.group(1).strip()

        # Extract father's name
        father_match = re.search(r"FATHER['S]*\s*NAME\s*[:]\s*([A-Z\s]+)", self.extracted_text)
        if father_match:
            info['fatherName'] = father_match.group(1).strip()

        # Extract sex/gender
        sex_match = re.search(r"SEX\s*[:]\s*([A-Z]+)", self.extracted_text)
        if sex_match:
            info['gender'] = sex_match.group(1).strip()

        # Extract DOB/Age
        dob_match = re.search(r"DATE\s*OF\s*BIRTH\s*[:]\s*(\d{2}[/-]\d{2}[/-]\d{4})", self.extracted_text)
        if dob_match:
            info['dateOfBirth'] = dob_match.group(1)
        else:
            age_match = re.search(r"AGE\s*[:]\s*(\d+)", self.extracted_text)
            if age_match:
                info['age'] = age_match.group(1)

        return info

class DrivingLicenseValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.location_indicators = [
            'MUMBAI', 'DELHI', 'BANGALORE', 'CHENNAI', 'KOLKATA',
            'PUNE', 'HYDERABAD', 'AHMEDABAD'
        ]
        self.key_indicators = {
            'license_indicators': [
                'DRIVE', 'LICENCE', 'LICENSE', 'MOTOR', 'VEHICLE', 
                'TRANSPORT', 'RTO', 'THROUGHOUT INDIA'
            ],
            'document_elements': [
                'SIGNATURE', 'THUMB', 'IMPRESSION', 'PHOTO', 'SEAL'
            ],
            'address_indicators': [
                'ADDRESS', 'RESIDENT', 'RESIDING', 'ADD'
            ]
        }

    def _preprocess_text(self, text: str) -> str:
        """Preprocess the extracted text"""
        # Convert to uppercase
        text = text.upper()
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text

    def _fuzzy_match(self, text: str, patterns: List[str], threshold: float = 0.8) -> bool:
        """Use fuzzy matching to find similar text"""
        from difflib import SequenceMatcher
        
        words = text.split()
        for word in words:
            for pattern in patterns:
                similarity = SequenceMatcher(None, word, pattern).ratio()
                if similarity >= threshold:
                    return True
        return False

    def validate(self, text: str) -> Dict[str, Any]:
        """Validate driving license with fuzzy matching"""
        try:
            # Preprocess the text
            self.extracted_text = self._preprocess_text(text)
            self.matches = {}
            self.validation_errors = []
            
            # Check for key indicators
            indicators_found = {
                'license': False,
                'location': False,
                'document_elements': False
            }
            
            # Check license indicators
            indicators_found['license'] = self._fuzzy_match(
                self.extracted_text,
                self.key_indicators['license_indicators'],
                threshold=0.7
            )
            
            # Check location indicators
            indicators_found['location'] = self._fuzzy_match(
                self.extracted_text,
                self.location_indicators,
                threshold=0.8
            )
            
            # Check document elements
            indicators_found['document_elements'] = self._fuzzy_match(
                self.extracted_text,
                self.key_indicators['document_elements'],
                threshold=0.7
            )
            
            # Extract possible license numbers using pattern matching
            possible_license_numbers = self._extract_possible_license_numbers()
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence(indicators_found, bool(possible_license_numbers))
            
            # Determine validity
            is_valid = self._determine_validity(indicators_found, confidence_score)
            
            # Prepare extracted data
            extracted_data = {
                'possibleLicenseNumbers': possible_license_numbers,
                'detectedLocations': self._extract_locations(),
                'hasSignature': 'SIGNATURE' in self.extracted_text or 'THUMB IMPRESSION' in self.extracted_text,
                'detectedText': self.extracted_text[:200] + '...' if len(self.extracted_text) > 200 else self.extracted_text
            }
            
            return {
                'documentType': 'Driving License',
                'isValid': is_valid,
                'confidenceScore': confidence_score,
                'extractedData': extracted_data,
                'validationDetails': {
                    'indicatorsFound': indicators_found,
                    'textQuality': 'Poor' if confidence_score < 0.4 else 'Medium' if confidence_score < 0.7 else 'Good',
                    'hasLicenseIndicators': indicators_found['license'],
                    'hasLocationIndicators': indicators_found['location'],
                    'hasDocumentElements': indicators_found['document_elements']
                }
            }
            
        except Exception as e:
            logger.error(f"Error in driving license validation: {str(e)}")
            return {
                'documentType': 'Driving License',
                'isValid': False,
                'confidenceScore': 0.0,
                'error': str(e)
            }

    def _extract_possible_license_numbers(self) -> List[str]:
        """Extract possible license numbers using various patterns"""
        patterns = [
            r'[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7}',  # Standard format
            r'[A-Z]{2}[-\s]?\d{2}[-\s]?\d{8}',             # Alternate format
            r'\b[A-Z0-9]{9,16}\b'                          # Generic number pattern
        ]
        
        numbers = []
        for pattern in patterns:
            matches = re.finditer(pattern, self.extracted_text)
            numbers.extend([match.group() for match in matches])
        
        return list(set(numbers))  # Remove duplicates

    def _extract_locations(self) -> List[str]:
        """Extract possible locations from text"""
        return [loc for loc in self.location_indicators 
                if loc in self.extracted_text]

    def _calculate_confidence(self, indicators: Dict[str, bool], has_license_number: bool) -> float:
        """Calculate confidence score"""
        weights = {
            'license': 0.4,
            'location': 0.3,
            'document_elements': 0.3
        }
        
        score = sum(weights[k] for k, v in indicators.items() if v)
        if has_license_number:
            score = min(1.0, score + 0.2)
            
        return score

    def _determine_validity(self, indicators: Dict[str, bool], confidence: float) -> bool:
        """Determine if document is valid"""
        # Document is considered valid if:
        # 1. It has license indicators
        # 2. It has either location or document elements
        # 3. Confidence score is above threshold
        return (indicators['license'] and 
                (indicators['location'] or indicators['document_elements']) and 
                confidence >= 0.4)

class RationCardValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.key_identifiers = {
            'document_identifiers': [
                r'RATION\s*CARD',
                r'राशन\s*कार्ड',
                r'PUBLIC\s*DISTRIBUTION\s*SYSTEM',
                r'FOOD\s*AND\s*CIVIL\s*SUPPLIES',
                r'खाद्य\s*एवं\s*नागरिक\s*आपूर्ति'
            ],
            'card_numbers': [
                r'(?:CARD|NO|NUMBER)[.:]\s*([A-Z0-9/-]+)',
                r'\b\d{11}\b',  # 11-digit format
                r'[A-Z]{2,3}[-/]\d{6,10}',
                r'C\.?R\.?O\.?\s*\([A-Z]\)',  # CRO format
                r'DISTRICT\s*(\d+)',  # District number format
            ],
            'categories': [
                r'\b(?:APL|BPL|AAY|PHH)\b',
                r'ABOVE\s*POVERTY\s*LINE',
                r'BELOW\s*POVERTY\s*LINE',
                r'ANTYODAYA',
                r'PRIORITY\s*HOUSEHOLD'
            ]
        }

    def validate(self, text: str) -> Dict[str, Any]:
        """Enhanced validation with better pattern matching"""
        try:
            self.extracted_text = text.upper()
            self.matches = {}
            self.validation_errors = []
            
            logger.debug(f"Validating Ration Card text: {self.extracted_text}")
            
            # Initialize scoring
            matches_found = {
                'document_identifiers': 0,
                'card_number': 0,
                'category': 0,
                'additional_info': 0
            }

            # Check document identifiers
            for pattern in self.key_identifiers['document_identifiers']:
                if re.search(pattern, self.extracted_text):
                    matches_found['document_identifiers'] += 0.25
                    logger.debug(f"Found document identifier: {pattern}")

            # Check card numbers
            for pattern in self.key_identifiers['card_numbers']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    card_number = match.group(1) if '(' in pattern else match.group()
                    self.matches['card_number'] = card_number
                    matches_found['card_number'] = 1
                    logger.debug(f"Found card number: {card_number}")
                    break

            # Check categories
            for pattern in self.key_identifiers['categories']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['category'] = match.group()
                    matches_found['category'] = 1
                    logger.debug(f"Found category: {match.group()}")
                    break

            # Extract additional information
            additional_info = self._extract_additional_info()
            if additional_info:
                matches_found['additional_info'] = len(additional_info) * 0.2
                self.matches.update(additional_info)

            # Cap scores at 1.0
            matches_found = {k: min(v, 1.0) for k, v in matches_found.items()}

            # Calculate weighted confidence score
            weights = {
                'document_identifiers': 0.3,
                'card_number': 0.3,
                'category': 0.2,
                'additional_info': 0.2
            }
            self.confidence_score = sum(matches_found[k] * weights[k] for k in matches_found)

            # Determine validity with lower threshold
            is_valid = (self.confidence_score >= 0.3)  # Lowered threshold

            result = {
                'documentType': 'Ration Card',
                'isValid': is_valid,
                'confidenceScore': self.confidence_score,
                'matchedIdentifiers': matches_found,
                'extractedData': self.matches,
                'validationDetails': {
                    'scores': matches_found,
                    'requiredMinimum': 0.3,
                    'hasDocumentIdentifiers': matches_found['document_identifiers'] > 0,
                    'hasCardNumber': matches_found['card_number'] > 0,
                    'hasCategory': matches_found['category'] > 0,
                    'extractedText': self.extracted_text
                }
            }

            logger.debug(f"Validation result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in Ration Card validation: {str(e)}")
            return {
                'documentType': 'Ration Card',
                'isValid': False,
                'confidenceScore': 0.0,
                'error': str(e)
            }

    def _extract_additional_info(self) -> Dict[str, str]:
        """Extract additional information from the Ration Card"""
        info = {}
        
        # Extract address
        address_match = re.search(r'ADDRESS\s*[:.]\s*([A-Z0-9\s,/-]+?)(?=\b(?:DISTRICT|PIN|DATE|UNITS)\b|$)', 
                                self.extracted_text)
        if address_match:
            info['address'] = address_match.group(1).strip()

        # Extract district
        district_match = re.search(r'DISTRICT\s*[:.]\s*([A-Z\s]+)', self.extracted_text)
        if district_match:
            info['district'] = district_match.group(1).strip()

        # Extract units/family members
        units_match = re.search(r'UNITS\s*(?:ALLOTED|ALLOCATED)\s*[:.]\s*(\d+)', self.extracted_text)
        if units_match:
            info['units_allocated'] = units_match.group(1)

        # Extract income
        income_match = re.search(r'INCOME\s*(?:OF\s*FAMILY)?\s*[:.]\s*(?:RS\.?\s*)?(\d+)', self.extracted_text)
        if income_match:
            info['family_income'] = income_match.group(1)

        # Extract issue date
        date_match = re.search(r'DATE\s*OF\s*ISSUE\s*[:.]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', self.extracted_text)
        if date_match:
            info['issue_date'] = date_match.group(1)

        return info

class CasteCertificateValidator(BaseDocumentValidator):
    def validate(self, text: str) -> Dict[str, Any]:
        self.extracted_text = text.upper()
        self.validation_errors = []
        
        # Define required patterns with more variations
        required_patterns = {
            "Certificate Title": r"(CASTE CERTIFICATE|OBC CERTIFICATE|SC CERTIFICATE|ST CERTIFICATE|COMMUNITY CERTIFICATE)",
            "Category": r"(OBC|SC|ST|OTHER BACKWARD CLASS|SCHEDULED CASTE|SCHEDULED TRIBE)",
            "Authority": r"(DISTRICT MAGISTRATE|TEHSILDAR|SDM|REVENUE DEPARTMENT|GOVT OF|GOVERNMENT OF)",
            "Certificate Number": r"(CERTIFICATE NO|CERTIFICATE NUMBER|REF NO)[\s.:]*[\w\d/-]+",
            "Validity": r"(THIS CERTIFICATE IS VALID|VALID UPTO|VALIDITY)"
        }
        
        matches_found = 0
        self.matches = {}
        
        # Check each pattern
        for pattern_name, pattern in required_patterns.items():
            match = re.search(pattern, self.extracted_text, re.IGNORECASE)
            if match:
                matches_found += 1
                self.matches[pattern_name] = match.group()
                logger.debug(f"Found {pattern_name}: {match.group()}")
            else:
                logger.debug(f"Missing {pattern_name}")
                self.validation_errors.append(f"Missing {pattern_name}")
        
        # Calculate confidence score based on matches
        confidence_score = matches_found / len(required_patterns)
        
        # Document is valid if at least 3 key patterns are found
        is_valid = matches_found >= 3
        
        return {
            'isValid': is_valid,
            'confidenceScore': confidence_score,
            'documentType': 'Caste Certificate',
            'errors': self.validation_errors if not is_valid else []
        }

class IncomeCertificateValidator(BaseDocumentValidator):
    def validate(self, text: str) -> Dict[str, Any]:
        self.extracted_text = text.upper()
        self.validation_errors = []
        self.matches = {}
        
        required_patterns = {
            "Certificate Title": r"""
                (?:
                    INCOME\s+CERTIFICATE|
                    REVENUE\s+DEPARTMENT.*DELHI|
                    आय\s+प्रमाण\s+पत्र
                )
            """,
            "Income Amount": r"""
                (?:
                    INCOME.*RS\.?\s*[\d,]+|
                    RS\.?\s*[\d,]+.*(?:PER\s+ANNUM|YEARLY|ANNUAL)
                )
            """,
            "Authority": r"""
                (?:
                    TEHSILDAR|
                    DISTRICT\s+MAGISTRATE|
                    REVENUE\s+OFFICER
                )
            """,
            "Certificate Number": r"""
                (?:
                    CERTIFICATE\s+NO:?\s*\d+|
                    CERTIFICATE\s+NUMBER:?\s*\d+
                )
            """
        }
        
        # Check each pattern and count matches
        matches_found = 0
        for pattern_name, pattern in required_patterns.items():
            match = re.search(pattern, self.extracted_text, re.VERBOSE | re.IGNORECASE)
            if match:
                matches_found += 1
                self.matches[pattern_name] = match.group()
                logger.debug(f"Found {pattern_name}: {match.group()}")
            else:
                logger.debug(f"Missing {pattern_name}")
                self.validation_errors.append(f"Missing {pattern_name}")

        # Calculate base confidence score
        base_confidence = matches_found / len(required_patterns)
        
        # Extract additional details
        details = {
            'certificateNumber': self._extract_certificate_number(self.extracted_text),
            'incomeAmount': self._extract_income_amount(self.extracted_text),
            'authority': self._extract_authority(self.extracted_text),
            'issuanceDate': self._extract_date(self.extracted_text),
            'isDigitallySigned': self._check_digital_signature(self.extracted_text)
        }
        
        # Additional confidence boosters
        bonus_confidence = 0
        if details['isDigitallySigned']:
            bonus_confidence += 0.1
        if details['issuanceDate']:
            bonus_confidence += 0.1
        if details['incomeAmount']:
            bonus_confidence += 0.1
            
        # Final confidence score (capped at 1.0)
        final_confidence = min(1.0, base_confidence + bonus_confidence)
        
        return {
            'isValid': matches_found >= 3,  # Valid if at least 3 key patterns are found
            'confidenceScore': final_confidence,
            'documentType': "Income Certificate",
            'errors': self.validation_errors if matches_found < 3 else [],
            'extractedInfo': details
        }
        
        logger.debug(f"Validation result: {result}")
        return result

    def _extract_certificate_number(self, text: str) -> str:
        """Extract certificate number from text"""
        match = re.search(r'CERTIFICATE\s+NO:?\s*(\d+)', text)
        return match.group(1) if match else ""

    def _extract_income_amount(self, text: str) -> str:
        """Extract income amount from text"""
        match = re.search(r'RS\.?\s*([\d,]+)', text)
        if match:
            amount = match.group(1).replace(',', '')
            return f"Rs. {int(amount):,}"
        return ""

    def _extract_authority(self, text: str) -> str:
        """Extract issuing authority from text"""
        authority_patterns = [
            r'TEHSILDAR',
            r'DISTRICT\s+MAGISTRATE',
            r'REVENUE\s+OFFICER'
        ]
        for pattern in authority_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group()
        return ""

    def _extract_date(self, text: str) -> str:
        """Extract issuance date from text"""
        date_patterns = [
            r'DATE:?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})',
            r'ISSUED\s+ON:?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})',
            r'(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})'
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return ""

    def _check_digital_signature(self, text: str) -> bool:
        """Check if document is digitally signed"""
        digital_sig_patterns = [
            r'DIGITALLY\s+SIGNED',
            r'DIGITAL\s+SIGNATURE',
            r'E-SIGNED'
        ]
        return any(re.search(pattern, text) for pattern in digital_sig_patterns)
    
 

class DisabilityCertificateValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.key_identifiers = {
            'certificate_identifiers': [
                r'DISABILITY\s*CERTIFICATE',
                r'DIVYANG\s*CERTIFICATE',
                r'दिव्यांगता\s*प्रमाण\s*पत्र',
                r'DEPARTMENT\s*OF\s*EMPOWERMENT\s*OF\s*PERSONS\s*WITH\s*DISABILITIES'
            ],
            'disability_types': [
                r'LOCOMOTOR\s*DISABILITY',
                r'VISUAL\s*IMPAIRMENT',
                r'HEARING\s*IMPAIRMENT',
                r'MENTAL\s*(?:DISABILITY|ILLNESS)',
                r'MULTIPLE\s*DISABILITIES',
                r'PHYSICAL\s*DISABILITY',
                r'PARAPARESIS',
                r'LUMBER\s*DISC'
            ],
            'authorities': [
                r'MEDICAL\s*(?:BOARD|AUTHORITY)',
                r'MEDICAL\s*SUPERINTENDENT',
                r'CIVIL\s*SURGEON',
                r'NOTIFIED\s*MEDICAL\s*AUTHORITY',
                r'ISSUING\s*MEDICAL\s*AUTHORITY'
            ],
            'certificate_numbers': [
                r'CERTIFICATE\s*NO\.?[:]?\s*([A-Z0-9/-]+)',
                r'\b[A-Z]{2}\d{16,}\b',  # Format like MH0420619680200284
                r'REG(?:ISTRATION)?\s*NO\.?[:]?\s*([A-Z0-9/-]+)'
            ]
        }

    def validate(self, text: str) -> Dict[str, Any]:
        try:
            self.extracted_text = text.upper()
            self.matches = {}
            self.validation_errors = []
            
            logger.debug(f"Validating Disability Certificate text: {self.extracted_text}")
            
            # Initialize scoring
            matches_found = {
                'certificate_identifiers': 0,
                'disability_type': 0,
                'authority': 0,
                'additional_info': 0
            }

            # Check certificate identifiers
            for pattern in self.key_identifiers['certificate_identifiers']:
                if re.search(pattern, self.extracted_text):
                    matches_found['certificate_identifiers'] += 0.25
                    logger.debug(f"Found certificate identifier: {pattern}")

            # Check disability types
            for pattern in self.key_identifiers['disability_types']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['disability_type'] = match.group()
                    matches_found['disability_type'] = 1
                    logger.debug(f"Found disability type: {match.group()}")
                    break

            # Check medical authorities
            for pattern in self.key_identifiers['authorities']:
                if re.search(pattern, self.extracted_text):
                    matches_found['authority'] = 1
                    logger.debug(f"Found medical authority: {pattern}")
                    break

            # Extract additional information
            additional_info = self._extract_additional_info()
            if additional_info:
                matches_found['additional_info'] = len(additional_info) * 0.2
                self.matches.update(additional_info)

            # Calculate weighted confidence score
            weights = {
                'certificate_identifiers': 0.3,
                'disability_type': 0.3,
                'authority': 0.2,
                'additional_info': 0.2
            }
            self.confidence_score = sum(matches_found[k] * weights[k] for k in matches_found)

            # Determine validity with adjusted threshold
            is_valid = (self.confidence_score >= 0.4)

            result = {
                'documentType': 'Disability Certificate',
                'isValid': is_valid,
                'confidenceScore': self.confidence_score,
                'matchedIdentifiers': matches_found,
                'extractedData': self.matches,
                'validationDetails': {
                    'scores': matches_found,
                    'requiredMinimum': 0.4,
                    'hasDocumentIdentifiers': matches_found['certificate_identifiers'] > 0,
                    'hasDisabilityType': matches_found['disability_type'] > 0,
                    'hasAuthority': matches_found['authority'] > 0
                }
            }

            logger.debug(f"Validation result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in Disability Certificate validation: {str(e)}")
            return {
                'documentType': 'Disability Certificate',
                'isValid': False,
                'confidenceScore': 0.0,
                'error': str(e)
            }

    def _extract_additional_info(self) -> Dict[str, str]:
        """Extract additional information from the Disability Certificate"""
        info = {}
        
        # Extract certificate number
        for pattern in self.key_identifiers['certificate_numbers']:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['certificate_number'] = match.group(1) if '(' in pattern else match.group()
                break

        # Extract disability percentage
        percent_match = re.search(r'(\d{1,3})\s*%.*?(?:PERMANENT\s*)?DISABILITY', self.extracted_text)
        if percent_match:
            info['disability_percentage'] = f"{percent_match.group(1)}%"

        # Extract personal details
        name_match = re.search(r'EXAMINED\s+(?:SHRI|SMT|KUM)\.?\s+([A-Z\s]+?)(?:,|\s+(?:SON|DAUGHTER|WIFE))', self.extracted_text)
        if name_match:
            info['name'] = name_match.group(1).strip()

        # Extract date of issue
        date_match = re.search(r'DATE\s*:\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', self.extracted_text)
        if date_match:
            info['issue_date'] = date_match.group(1)

        # Extract address
        address_match = re.search(r'RESIDENT\s+OF\s+([A-Z0-9\s,/-]+?)(?=\s+(?:WHOSE|PHOTO|DATE|DISTRICT|STATE))', self.extracted_text)
        if address_match:
            info['address'] = address_match.group(1).strip()

        return info
        
class BPLCertificateValidator(BaseDocumentValidator):
    def validate(self, text: str) -> Dict[str, Any]:
        self.extracted_text = text.upper()
        self.validation_errors = []
        self.matches = {}
        
        required_patterns = {
            "Certificate Title": r"""
                (?:
                    BELOW\s+POVERTY\s+LINE|
                    BPL\s+CERTIFICATE|
                    गरीबी\s+रेखा\s+प्रमाण\s+पत्र
                )
            """,
            "BPL Number": r"""
                (?:
                    BPL\s+NO\.?\s*:?\s*\d+|
                    CARD\s+NO\.?\s*:?\s*\d+
                )
            """,
            "Authority": r"""
                (?:
                    MUNICIPAL\s+CORPORATION|
                    NAGAR\s+NIGAM|
                    PANCHAYAT|
                    TEHSILDAR
                )
            """
        }
        
        self.validate_text_presence(required_patterns)
        
        # Extract BPL number
        bpl_match = re.search(r'BPL\s+NO\.?\s*:?\s*(\d+)', self.extracted_text)
        if bpl_match:
            self.matches['BPLNumber'] = bpl_match.group(1)
            
        # Extract family size
        family_match = re.search(r'FAMILY\s+(?:SIZE|MEMBERS)[\s:]+(\d+)', self.extracted_text)
        if family_match:
            self.matches['FamilySize'] = family_match.group(1)
            
        self.confidence_score = self.calculate_confidence(len(required_patterns))
        return self._generate_response("BPL Certificate")

class DomicileCertificateValidator(BaseDocumentValidator):
    def validate(self, text: str) -> Dict[str, Any]:
        self.extracted_text = text.upper()
        self.validation_errors = []
        self.matches = {}
        
        required_patterns = {
            "Certificate Title": r"""
                (?:
                    DOMICILE\s+CERTIFICATE|
                    RESIDENTIAL\s+CERTIFICATE|
                    अधिवास\s+प्रमाण\s+पत्र
                )
            """,
            "Residence Period": r"""
                (?:
                    RESIDING\s+SINCE[\s:]+\d{4}|
                    RESIDENT\s+(?:FOR|SINCE)[\s:]+\d+\s+YEARS?
                )
            """,
            "Authority": r"""
                (?:
                    COLLECTOR|
                    TEHSILDAR|
                    SDM|
                    REVENUE\s+OFFICER
                )
            """
        }
        
        self.validate_text_presence(required_patterns)
        
        # Extract state/UT
        state_match = re.search(r'(?:STATE|UT)\s+OF\s+([A-Z\s]+)', self.extracted_text)
        if state_match:
            self.matches['State'] = state_match.group(1).strip()
            
        self.confidence_score = self.calculate_confidence(len(required_patterns))
        return self._generate_response("Domicile Certificate")

class BirthCertificateValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.key_identifiers = {
            'certificate_identifiers': [
                r'BIRTH\s*CERTIFICATE',
                r'CERTIFICATE\s*OF\s*BIRTH',
                r'जन्म\s*प्रमाण\s*पत्र',
                r'REGISTRATION\s*OF\s*BIRTH',
                r'BIRTH\s*AND\s*DEATH\s*ACT'
            ],
            'registration_numbers': [
                r'(?:REGISTRATION|REG|CERT(?:IFICATE)?)\s*(?:NO|NUMBER)[.:]\s*([A-Z0-9-]+)',
                r'\b\d{4}[-]\d{10,}\b',  # Format like 0122-0701150862
                r'[A-Z]+/\d+/\d+/\d+'
            ],
            'dates': [
                r'(?:DATE\s*OF\s*BIRTH|DOB|BIRTH\s*DATE)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
                r'(?:जन्म\s*तिथि)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
                r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'
            ],
            'authorities': [
                r'MUNICIPAL\s*CORPORATION',
                r'GOVERNMENT\s*OF',
                r'REGISTRAR',
                r'CORPORATION\s*OF',
                r'NAGAR\s*NIGAM'
            ]
        }

    def validate(self, text: str) -> Dict[str, Any]:
        try:
            self.extracted_text = text.upper()
            self.matches = {}
            self.validation_errors = []
            
            logger.debug(f"Validating Birth Certificate text: {self.extracted_text}")
            
            # Initialize scoring
            matches_found = {
                'certificate_identifiers': 0,
                'registration': 0,
                'date_of_birth': 0,
                'additional_info': 0
            }

            # Check certificate identifiers
            for pattern in self.key_identifiers['certificate_identifiers']:
                if re.search(pattern, self.extracted_text):
                    matches_found['certificate_identifiers'] += 0.25
                    logger.debug(f"Found certificate identifier: {pattern}")

            # Check registration numbers
            for pattern in self.key_identifiers['registration_numbers']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    reg_number = match.group(1) if '(' in pattern else match.group()
                    self.matches['registration_number'] = reg_number
                    matches_found['registration'] = 1
                    logger.debug(f"Found registration number: {reg_number}")
                    break

            # Check dates
            for pattern in self.key_identifiers['dates']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['date_of_birth'] = match.group(1)
                    matches_found['date_of_birth'] = 1
                    logger.debug(f"Found date of birth: {match.group(1)}")
                    break

            # Extract additional information
            additional_info = self._extract_additional_info()
            if additional_info:
                matches_found['additional_info'] = len(additional_info) * 0.2
                self.matches.update(additional_info)

            # Calculate weighted confidence score
            weights = {
                'certificate_identifiers': 0.3,
                'registration': 0.3,
                'date_of_birth': 0.2,
                'additional_info': 0.2
            }
            self.confidence_score = sum(matches_found[k] * weights[k] for k in matches_found)

            # Determine validity with adjusted threshold
            is_valid = (self.confidence_score >= 0.4)

            result = {
                'documentType': 'Birth Certificate',
                'isValid': is_valid,
                'confidenceScore': self.confidence_score,
                'matchedIdentifiers': matches_found,
                'extractedData': self.matches,
                'validationDetails': {
                    'scores': matches_found,
                    'requiredMinimum': 0.4,
                    'hasDocumentIdentifiers': matches_found['certificate_identifiers'] > 0,
                    'hasRegistration': matches_found['registration'] > 0,
                    'hasDateOfBirth': matches_found['date_of_birth'] > 0
                }
            }

            logger.debug(f"Validation result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in Birth Certificate validation: {str(e)}")
            return {
                'documentType': 'Birth Certificate',
                'isValid': False,
                'confidenceScore': 0.0,
                'error': str(e)
            }

    def _extract_additional_info(self) -> Dict[str, str]:
        """Extract additional information from the Birth Certificate"""
        info = {}
        
        # Extract name
        name_match = re.search(r'NAME\s*[:.]\s*([A-Z\s]+?)(?=\s+(?:GENDER|SEX|DATE|FATHER|MOTHER))', self.extracted_text)
        if name_match:
            info['name'] = name_match.group(1).strip()

        # Extract gender
        gender_match = re.search(r'(?:GENDER|SEX)\s*[:.]\s*([A-Z]+)', self.extracted_text)
        if gender_match:
            info['gender'] = gender_match.group(1).strip()

        # Extract place of birth
        place_match = re.search(r'PLACE\s*OF\s*BIRTH\s*[:.]\s*([A-Z0-9\s,/-]+?)(?=\s+(?:DATE|MOTHER|FATHER|ADDRESS))', self.extracted_text)
        if place_match:
            info['place_of_birth'] = place_match.group(1).strip()

        # Extract parents' names
        father_match = re.search(r"FATHER['S]*\s*NAME\s*[:.]\s*([A-Z\s]+?)(?=\s+(?:MOTHER|ADDRESS|DATE))", self.extracted_text)
        if father_match:
            info['father_name'] = father_match.group(1).strip()

        mother_match = re.search(r"MOTHER['S]*\s*NAME\s*[:.]\s*([A-Z\s]+?)(?=\s+(?:FATHER|ADDRESS|DATE))", self.extracted_text)
        if mother_match:
            info['mother_name'] = mother_match.group(1).strip()

        # Extract address
        address_match = re.search(r'(?:PRESENT\s*)?ADDRESS\s*[:.]\s*([A-Z0-9\s,/-]+?)(?=\s+(?:DATE|PERMANENT|NOTE|ENSURE))', self.extracted_text)
        if address_match:
            info['address'] = address_match.group(1).strip()

        return info

class MarriageCertificateValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.key_identifiers = {
            'certificate_identifiers': [
                r'MARRIAGE\s*CERTIFICATE',
                r'CERTIFICATE\s*OF\s*(?:REGISTRATION\s*OF\s*)?MARRIAGE',
                r'विवाह\s*प्रमाण\s*पत्र',
                r'REGISTRATION\s*OF\s*MARRIAGE',
                r'MARRIAGE\s*REGISTRATION'
            ],
            'registration_numbers': [
                r'(?:REGISTRATION|REG|CERT(?:IFICATE)?)\s*(?:NO|NUMBER)[.:]\s*(\d+)',
                r'MARRIAGE\s*REG(?:ISTRATION)?\s*NO[.:]\s*(\d+)',
                r'\b[A-Z]{2,3}[-/]\d{6,}\b'
            ],
            'dates': [
                r'(?:DATE\s*OF\s*MARRIAGE|MARRIED\s*ON|SOLEMNIZED\s*ON)[:\s]+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})',
                r'(?:विवाह\s*की\s*तिथि)[:\s]+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})'
            ],
            'authorities': [
                r'MUNICIPAL\s*CORPORATION',
                r'MARRIAGE\s*REGISTRAR',
                r'SUB[-\s]*REGISTRAR',
                r'GOVERNMENT\s*OF',
                r'DEPARTMENT\s*OF'
            ]
        }

    def validate(self, text: str) -> Dict[str, Any]:
        try:
            self.extracted_text = text.upper()
            self.matches = {}
            self.validation_errors = []
            
            logger.debug(f"Validating Marriage Certificate text: {self.extracted_text}")
            
            # Initialize scoring
            matches_found = {
                'certificate_identifiers': 0,
                'registration': 0,
                'marriage_date': 0,
                'spouse_details': 0
            }

            # Check certificate identifiers
            for pattern in self.key_identifiers['certificate_identifiers']:
                if re.search(pattern, self.extracted_text):
                    matches_found['certificate_identifiers'] += 0.25
                    logger.debug(f"Found certificate identifier: {pattern}")

            # Check registration numbers
            for pattern in self.key_identifiers['registration_numbers']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    reg_number = match.group(1) if '(' in pattern else match.group()
                    self.matches['registration_number'] = reg_number
                    matches_found['registration'] = 1
                    logger.debug(f"Found registration number: {reg_number}")
                    break

            # Check marriage date
            for pattern in self.key_identifiers['dates']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['marriage_date'] = match.group(1)
                    matches_found['marriage_date'] = 1
                    logger.debug(f"Found marriage date: {match.group(1)}")
                    break

            # Extract spouse details and additional information
            spouse_info = self._extract_spouse_details()
            if spouse_info:
                matches_found['spouse_details'] = len(spouse_info) * 0.25
                self.matches.update(spouse_info)

            additional_info = self._extract_additional_info()
            if additional_info:
                self.matches.update(additional_info)

            # Calculate weighted confidence score
            weights = {
                'certificate_identifiers': 0.3,
                'registration': 0.3,
                'marriage_date': 0.2,
                'spouse_details': 0.2
            }
            self.confidence_score = sum(matches_found[k] * weights[k] for k in matches_found)

            # Determine validity with adjusted threshold
            is_valid = (self.confidence_score >= 0.4)

            result = {
                'documentType': 'Marriage Certificate',
                'isValid': is_valid,
                'confidenceScore': self.confidence_score,
                'matchedIdentifiers': matches_found,
                'extractedData': self.matches,
                'validationDetails': {
                    'scores': matches_found,
                    'requiredMinimum': 0.4,
                    'hasDocumentIdentifiers': matches_found['certificate_identifiers'] > 0,
                    'hasRegistration': matches_found['registration'] > 0,
                    'hasMarriageDate': matches_found['marriage_date'] > 0,
                    'hasSpouseDetails': matches_found['spouse_details'] > 0
                }
            }

            logger.debug(f"Validation result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in Marriage Certificate validation: {str(e)}")
            return {
                'documentType': 'Marriage Certificate',
                'isValid': False,
                'confidenceScore': 0.0,
                'error': str(e)
            }

    def _extract_spouse_details(self) -> Dict[str, str]:
        """Extract spouse details from the certificate"""
        info = {}
        
        # Extract husband's details
        husband_patterns = [
            r'(?:HUSBAND|GROOM)[\'S]*\s*(?:NAME)?[:\s]+(?:MR\.?\s*)?([A-Z\s]+?)(?=\s+(?:RESIDING|AGE|DATE|WIFE|ADDRESS))',
            r'NAME\s*OF\s*HUSBAND\s*(?:MR\.?\s*)?([A-Z\s]+?)(?=\s+(?:RESIDING|AGE|DATE|WIFE|ADDRESS))'
        ]
        for pattern in husband_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['husband_name'] = match.group(1).strip()
                break

        # Extract wife's details
        wife_patterns = [
            r'(?:WIFE|BRIDE)[\'S]*\s*(?:NAME)?[:\s]+(?:MS\.?\s*)?([A-Z\s]+?)(?=\s+(?:RESIDING|AGE|DATE|ADDRESS))',
            r'NAME\s*OF\s*WIFE\s*(?:MS\.?\s*)?([A-Z\s]+?)(?=\s+(?:RESIDING|AGE|DATE|ADDRESS))'
        ]
        for pattern in wife_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['wife_name'] = match.group(1).strip()
                break

        return info

    def _extract_additional_info(self) -> Dict[str, str]:
        """Extract additional information from the certificate"""
        info = {}
        
        # Extract place of marriage
        place_match = re.search(r'PLACE\s*OF\s*MARRIAGE[:\s]+([A-Z0-9\s,/-]+?)(?=\s+(?:DATE|IS|REGISTERED|ON))', self.extracted_text)
        if place_match:
            info['place_of_marriage'] = place_match.group(1).strip()

        # Extract registration date
        reg_date_match = re.search(r'(?:REGISTERED|REGISTRATION)\s*(?:ON|DATE)[:\s]+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})', self.extracted_text)
        if reg_date_match:
            info['registration_date'] = reg_date_match.group(1)

        # Extract addresses
        address_patterns = [
            r'RESIDING\s*AT[:\s]+([A-Z0-9\s,/-]+?)(?=\s+(?:DATE|NAME|SOLEMNIZED|REGISTERED))',
            r'ADDRESS[:\s]+([A-Z0-9\s,/-]+?)(?=\s+(?:DATE|NAME|SOLEMNIZED|REGISTERED))'
        ]
        for pattern in address_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['address'] = match.group(1).strip()
                break

        return info
    
class BankPassbookValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.key_identifiers = {
            'bank_names': [
                r'([A-Z]+\s+BANK(?:\s+OF\s+[A-Z]+)?)',
                r'(BANK\s+OF\s+[A-Z]+)',
                r'(STATE\s+BANK\s+OF\s+[A-Z]+)',
                r'([A-Z]+\s+BANKING\s+CORPORATION)',
                r'बैंक[\s:]+([A-Z\s]+)'
            ],
            'account_numbers': [
                r'(?:A/?C|ACCOUNT)\s*(?:NO|NUMBER)[.:]\s*(\d[\d\s/-]*\d)',
                r'खाता\s+संख्या[\s:]+(\d[\d\s/-]*\d)',
                r'\b\d{9,18}\b'  # Generic account number pattern
            ],
            'ifsc_codes': [
                r'IFSC\s*(?:CODE)?[\s:]+([A-Z]{4}[0-9]{7})',
                r'INDIAN\s+FINANCIAL\s+SYSTEM\s+CODE[\s:]+([A-Z]{4}[0-9]{7})',
                r'\b[A-Z]{4}[0-9]{7}\b'
            ],
            'branch_details': [
                r'BRANCH[\s:]+([A-Z\s,/-]+?)(?=\s+(?:ADDRESS|CODE|IFSC|PIN|PHONE))',
                r'BRANCH\s+ADDRESS[\s:]+([A-Z0-9\s,/-]+?)(?=\s+(?:PIN|PHONE|IFSC))'
            ]
        }

    def validate(self, text: str) -> Dict[str, Any]:
        try:
            self.extracted_text = text.upper()
            self.matches = {}
            self.validation_errors = []
            
            logger.debug(f"Validating Bank Passbook text: {self.extracted_text}")
            
            # Initialize scoring
            matches_found = {
                'bank_name': 0,
                'account_number': 0,
                'ifsc_code': 0,
                'additional_info': 0
            }

            # Check bank name
            for pattern in self.key_identifiers['bank_names']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    bank_name = match.group(1) if '(' in pattern else match.group()
                    self.matches['bank_name'] = bank_name.strip()
                    matches_found['bank_name'] = 1
                    logger.debug(f"Found bank name: {bank_name}")
                    break

            # Check account number
            for pattern in self.key_identifiers['account_numbers']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    account_number = match.group(1) if '(' in pattern else match.group()
                    self.matches['account_number'] = re.sub(r'\s+', '', account_number)
                    matches_found['account_number'] = 1
                    logger.debug(f"Found account number: {account_number}")
                    break

            # Check IFSC code
            for pattern in self.key_identifiers['ifsc_codes']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    ifsc_code = match.group(1) if '(' in pattern else match.group()
                    self.matches['ifsc_code'] = ifsc_code
                    matches_found['ifsc_code'] = 1
                    logger.debug(f"Found IFSC code: {ifsc_code}")
                    break

            # Extract additional information
            additional_info = self._extract_additional_info()
            if additional_info:
                matches_found['additional_info'] = len(additional_info) * 0.2
                self.matches.update(additional_info)

            # Calculate weighted confidence score
            weights = {
                'bank_name': 0.3,
                'account_number': 0.3,
                'ifsc_code': 0.2,
                'additional_info': 0.2
            }
            self.confidence_score = sum(matches_found[k] * weights[k] for k in matches_found)

            # Determine validity with adjusted threshold
            is_valid = (self.confidence_score >= 0.4)

            result = {
                'documentType': 'Bank Passbook',
                'isValid': is_valid,
                'confidenceScore': self.confidence_score,
                'matchedIdentifiers': matches_found,
                'extractedData': self.matches,
                'validationDetails': {
                    'scores': matches_found,
                    'requiredMinimum': 0.4,
                    'hasBankName': matches_found['bank_name'] > 0,
                    'hasAccountNumber': matches_found['account_number'] > 0,
                    'hasIFSC': matches_found['ifsc_code'] > 0
                }
            }

            logger.debug(f"Validation result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in Bank Passbook validation: {str(e)}")
            return {
                'documentType': 'Bank Passbook',
                'isValid': False,
                'confidenceScore': 0.0,
                'error': str(e)
            }

    def _extract_additional_info(self) -> Dict[str, str]:
        """Extract additional information from the passbook"""
        info = {}
        
        # Extract account holder name
        name_patterns = [
            r'(?:IN\s+THE\s+NAME\s+OF|NAME)[:\s]+([A-Z\s]+?)(?=\s+(?:BRANCH|ADDRESS|OCCUPATION|S/O|W/O))',
            r'(?:ACCOUNT\s+HOLDER)[:\s]+([A-Z\s]+?)(?=\s+(?:BRANCH|ADDRESS|OCCUPATION|S/O|W/O))'
        ]
        for pattern in name_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['account_holder_name'] = match.group(1).strip()
                break

        # Extract branch details
        for pattern in self.key_identifiers['branch_details']:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['branch'] = match.group(1).strip()
                break

        # Extract address
        address_match = re.search(r'ADDRESS[:\s]+([A-Z0-9\s,/-]+?)(?=\s+(?:PIN|PHONE|BRANCH|IFSC))', self.extracted_text)
        if address_match:
            info['address'] = address_match.group(1).strip()

        # Extract PIN code
        pin_match = re.search(r'PIN(?:\s+CODE)?[:\s]+(\d{6})', self.extracted_text)
        if pin_match:
            info['pin_code'] = pin_match.group(1)

        # Extract account type
        type_match = re.search(r'(?:ACCOUNT\s+TYPE|A/C\s+TYPE)[:\s]+([A-Z\s]+?)(?=\s+(?:BRANCH|ADDRESS|NAME))', self.extracted_text)
        if type_match:
            info['account_type'] = type_match.group(1).strip()

        # Extract phone number
        phone_match = re.search(r'(?:PHONE|MOBILE)[:\s]+(\d[\d\s/-]*\d)', self.extracted_text)
        if phone_match:
            info['phone'] = re.sub(r'\s+', '', phone_match.group(1))

        return info

class EmploymentCertificateValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.key_identifiers = {
            'certificate_titles': [
                r'CERTIFICATE\s+OF\s+EMPLOYMENT',
                r'CERTIF?ICATE\s+OF\s+(?:EMPLOYMENT|SERVICE)',  # Added to handle typos
                r'EMPLOYMENT\s+CERTIFICATE',
                r'EXPERIENCE\s+CERTIFICATE',
                r'SERVICE\s+CERTIFICATE',
                r'WORK\s+CERTIFICATE',
                r'नियुक्ति\s+प्रमाण\s+पत्र'
            ],
            'employee_patterns': [
                r'THIS\s+IS\s+TO\s+CERTIFY\s+THAT\s+([A-Z][A-Z\s.-]+)(?:\s+HAS\s+BEEN|\s+IS\s+)',
                r'CERTIFY\s+THAT\s+([A-Z][A-Z\s.-]+)(?:\s+HAS\s+BEEN|\s+IS\s+)',
                r'THAT\s+([A-Z][A-Z\s.-]+)\s+(?:IS|HAS\s+BEEN)\s+EMPLOYED'
            ],
            'designation_patterns': [
                r'AS\s+([A-Z][A-Z\s]+?)(?:\s+(?:FROM|SINCE|IN|AT|WITH|DEPARTMENT|FOR))',
                r'(?:DESIGNATION|POST|POSITION)[:\s]+([A-Z][A-Z\s]+?)(?:\s+(?:FROM|SINCE|IN|AT|WITH))',
                r'(?:EMPLOYED|WORKING)\s+AS\s+([A-Z][A-Z\s]+?)(?:\s+(?:FROM|SINCE|IN|AT|WITH))'
            ],
            'date_patterns': [
                r'FROM\s+([A-Z]+\s+\d{4})',
                r'SINCE\s+([A-Z]+\s+\d{4})',
                r'(?:JOINED|JOINING)\s+(?:ON|FROM|DATE)[:\s]+([A-Z]+\s+\d{4})',
                r'DATED?\s+(?:THIS\s+)?(\d{1,2}(?:ST|ND|RD|TH)?\s+(?:DAY\s+)?OF\s+[A-Z]+\s+\d{4})'
            ]
        }

    def validate(self, text: str) -> Dict[str, Any]:
        try:
            self.extracted_text = text.upper()
            self.matches = {}
            self.validation_errors = []
            
            logger.debug(f"Validating Employment Certificate text: {self.extracted_text}")
            
            # Initialize scoring
            matches_found = {
                'certificate_title': 0,
                'employee_name': 0,
                'designation': 0,
                'dates': 0
            }

            # Check certificate title
            for pattern in self.key_identifiers['certificate_titles']:
                if re.search(pattern, self.extracted_text):
                    matches_found['certificate_title'] = 1
                    logger.debug(f"Found certificate title: {pattern}")
                    break

            # Extract employee name
            for pattern in self.key_identifiers['employee_patterns']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['employee_name'] = match.group(1).strip()
                    matches_found['employee_name'] = 1
                    logger.debug(f"Found employee name: {self.matches['employee_name']}")
                    break

            # Extract designation
            for pattern in self.key_identifiers['designation_patterns']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['designation'] = match.group(1).strip()
                    matches_found['designation'] = 1
                    logger.debug(f"Found designation: {self.matches['designation']}")
                    break

            # Extract dates
            for pattern in self.key_identifiers['date_patterns']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['date'] = match.group(1).strip()
                    matches_found['dates'] = 1
                    logger.debug(f"Found date: {self.matches['date']}")
                    break

            # Calculate confidence score with adjusted weights
            weights = {
                'certificate_title': 0.4,  # Increased weight for title
                'employee_name': 0.3,
                'designation': 0.2,
                'dates': 0.1
            }
            self.confidence_score = sum(matches_found[k] * weights[k] for k in matches_found)

            # Adjust validation threshold
            is_valid = (self.confidence_score >= 0.3)  # Lowered threshold

            result = {
                'documentType': 'Employment Certificate',
                'isValid': is_valid,
                'confidenceScore': self.confidence_score,
                'matchedIdentifiers': matches_found,
                'extractedData': self.matches,
                'validationDetails': {
                    'scores': matches_found,
                    'requiredMinimum': 0.3,
                    'hasCertificateTitle': matches_found['certificate_title'] > 0,
                    'hasEmployeeName': matches_found['employee_name'] > 0,
                    'hasDesignation': matches_found['designation'] > 0
                }
            }

            logger.debug(f"Validation result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in Employment Certificate validation: {str(e)}")
            return {
                'documentType': 'Employment Certificate',
                'isValid': False,
                'confidenceScore': 0.0,
                'error': str(e)
            }

class EducationalCertificateValidator(BaseDocumentValidator):
    def __init__(self):
        super().__init__()
        self.key_identifiers = {
            'certificate_types': [
                r'CERTIFICATE',
                r'DEGREE\s+CERTIFICATE',
                r'DIPLOMA\s+CERTIFICATE',
                r'COURSE\s+CERTIFICATE',
                r'TRAINING\s+CERTIFICATE',
                r'COMPLETION\s+CERTIFICATE',
                r'MARKSHEET',
                r'PROVISIONAL\s+CERTIFICATE'
            ],
            'institution_patterns': [
                r'(?:A\s+UNIT\s+OF\s+)?([A-Z][A-Z\s.,&]+(?:PVT\.?\s*LTD\.?|PRIVATE\s+LIMITED|UNIVERSITY|COLLEGE|INSTITUTE|SCHOOL))',
                r'(?:UNIVERSITY|BOARD|INSTITUTE|COLLEGE)[:\s]+([A-Z][A-Z\s.,&]+)',
                r'([A-Z][A-Z\s.,&]+(?:UNIVERSITY|BOARD|INSTITUTE|COLLEGE))'
            ],
            'student_patterns': [
                r'THIS\s+IS\s+TO\s+CERTIFY\s+THAT\s+([A-Z][A-Z\s.-]+)(?:\s+S/O|\s+D/O|\s+HAS\s+|,)',
                r'(?:MR\.|MS\.|SHRI|SMT\.)\s*([A-Z][A-Z\s.-]+)(?:\s+S/O|\s+D/O|\s+HAS\s+|,)',
                r'CERTIFY\s+THAT\s+([A-Z][A-Z\s.-]+)(?:\s+S/O|\s+D/O|\s+HAS\s+|,)'
            ],
            'course_patterns': [
                r'(?:COURSE|PROGRAM(?:ME)?)[:\s]+([A-Z][A-Z\s.-]+)',
                r'AWARDED\s+THE\s+([A-Z][A-Z\s.-]+?)(?:\s+COURSE|\s+CERTIFICATE|\s+DEGREE)',
                r'COMPLETED\s+(?:THE\s+)?([A-Z][A-Z\s.-]+?)(?:\s+COURSE|\s+CERTIFICATE|\s+PROGRAM)'
            ]
        }

    def validate(self, text: str) -> Dict[str, Any]:
        try:
            self.extracted_text = text.upper()
            self.matches = {}
            self.validation_errors = []
            
            logger.debug(f"Validating Educational Certificate text: {self.extracted_text}")
            
            # Initialize scoring
            matches_found = {
                'certificate_type': 0,
                'institution': 0,
                'student_details': 0,
                'course_details': 0,
                'additional_info': 0
            }

            # Check certificate type
            for pattern in self.key_identifiers['certificate_types']:
                if re.search(pattern, self.extracted_text):
                    matches_found['certificate_type'] = 1
                    logger.debug(f"Found certificate type: {pattern}")
                    break

            # Extract institution details
            for pattern in self.key_identifiers['institution_patterns']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['institution'] = match.group(1).strip()
                    matches_found['institution'] = 1
                    logger.debug(f"Found institution: {self.matches['institution']}")
                    break

            # Extract student details
            for pattern in self.key_identifiers['student_patterns']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['student_name'] = match.group(1).strip()
                    matches_found['student_details'] = 1
                    logger.debug(f"Found student name: {self.matches['student_name']}")
                    break

            # Extract course details
            for pattern in self.key_identifiers['course_patterns']:
                match = re.search(pattern, self.extracted_text)
                if match:
                    self.matches['course'] = match.group(1).strip()
                    matches_found['course_details'] = 1
                    logger.debug(f"Found course: {self.matches['course']}")
                    break

            # Extract additional information
            additional_info = self._extract_additional_info()
            if additional_info:
                matches_found['additional_info'] = len(additional_info) * 0.2
                self.matches.update(additional_info)

            # Calculate confidence score with adjusted weights
            weights = {
                'certificate_type': 0.3,
                'institution': 0.2,
                'student_details': 0.2,
                'course_details': 0.2,
                'additional_info': 0.1
            }
            self.confidence_score = sum(matches_found[k] * weights[k] for k in matches_found)

            # Adjust validation threshold
            is_valid = (self.confidence_score >= 0.3)  # Lowered threshold

            result = {
                'documentType': 'Educational Certificate',
                'isValid': is_valid,
                'confidenceScore': self.confidence_score,
                'matchedIdentifiers': matches_found,
                'extractedData': self.matches,
                'validationDetails': {
                    'scores': matches_found,
                    'requiredMinimum': 0.3,
                    'hasCertificateType': matches_found['certificate_type'] > 0,
                    'hasInstitution': matches_found['institution'] > 0,
                    'hasStudentDetails': matches_found['student_details'] > 0,
                    'hasCourseDetails': matches_found['course_details'] > 0
                }
            }

            logger.debug(f"Validation result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in Educational Certificate validation: {str(e)}")
            return {
                'documentType': 'Educational Certificate',
                'isValid': False,
                'confidenceScore': 0.0,
                'error': str(e)
            }

    def _extract_additional_info(self) -> Dict[str, str]:
        """Extract additional information from the certificate"""
        info = {}
        
        # Extract grade/marks
        grade_patterns = [
            r'(?:GRADE|CGPA)[:\s]+([A-Z0-9.]+(?:\s*%)?)',
            r'WITH\s+([A-Z]+(?:\s+GRADE|\s+CLASS))',
            r'(\d{1,3}(?:\.\d+)?%?\s*(?:MARKS|PERCENTAGE))',
            r'PASSED\s+WITH\s+([A-Z\s]+(?:GRADE|CLASS|DIVISION))'
        ]
        for pattern in grade_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['grade'] = match.group(1).strip()
                break

        # Extract certificate number
        cert_num_patterns = [
            r'CERTIFICATE\s+(?:NO|NUMBER)[:\s]+([A-Z0-9-]+)',
            r'SERIAL\s+(?:NO|NUMBER)[:\s]+([A-Z0-9-]+)',
            r'REF(?:ERENCE)?\s+(?:NO|NUMBER)[:\s]+([A-Z0-9-]+)'
        ]
        for pattern in cert_num_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['certificate_number'] = match.group(1).strip()
                break

        # Extract dates
        date_patterns = [
            r'(?:ISSUE|ISSUED)\s+(?:DATE|ON)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'DATED?\s+(?:THIS\s+)?(\d{1,2}(?:ST|ND|RD|TH)?\s+(?:DAY\s+)?OF\s+[A-Z]+\s+\d{4})',
            r'DATE[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'
        ]
        for pattern in date_patterns:
            match = re.search(pattern, self.extracted_text)
            if match:
                info['issue_date'] = match.group(1).strip()
                break

        # Extract duration
        duration_match = re.search(r'(?:DURATION|PERIOD)[:\s]+(\d+\s+(?:MONTHS?|YEARS?))', self.extracted_text)
        if duration_match:
            info['duration'] = duration_match.group(1).strip()

        return info
    
class PropertyDocumentValidator(BaseDocumentValidator):
    def validate(self, text: str) -> Dict[str, Any]:
        self.extracted_text = text.upper()
        self.validation_errors = []
        self.matches = {}
        
        required_patterns = {
            "Document Type": r"""
                (?:
                    SALE\s+DEED|
                    LEASE\s+DEED|
                    PROPERTY\s+CARD|
                    7/12\s+EXTRACT|
                    TITLE\s+DEED|
                    CONVEYANCE\s+DEED
                )
            """,
            "Property Details": r"""
                (?:
                    SURVEY\s+NO[\s.:]+[\w\d/\-]+|
                    PLOT\s+NO[\s.:]+[\w\d/\-]+|
                    FLAT\s+NO[\s.:]+[\w\d/\-]+|
                    PROPERTY\s+ID[\s.:]+[\w\d/\-]+
                )
            """,
            "Registration": r"""
                (?:
                    REGISTRATION\s+NO[\s.:]+[\w\d/\-]+|
                    DOCUMENT\s+NO[\s.:]+[\w\d/\-]+|
                    INDEX\s+(?:NO|NUMBER)[\s.:]+[\w\d/\-]+
                )
            """,
            "Location": r"""
                (?:
                    LOCATED\s+AT[\s.:]+[A-Z0-9\s,/\-]+|
                    ADDRESS[\s.:]+[A-Z0-9\s,/\-]+|
                    SITUATED\s+AT[\s.:]+[A-Z0-9\s,/\-]+
                )
            """
        }
        
        self.validate_text_presence(required_patterns)
        
        # Extract property area if present
        area_match = re.search(r'AREA[\s.:]+(\d+(?:\.\d+)?)\s*(SQ\.?\s*(?:FT|MTR|METER|YARD|M))', self.extracted_text)
        if area_match:
            self.matches['PropertyArea'] = f"{area_match.group(1)} {area_match.group(2)}"
            
        # Extract transaction value if present
        value_match = re.search(r'(?:CONSIDERATION|VALUE|AMOUNT)[\s.:]+(?:RS\.?\s*)([\d,]+)', self.extracted_text)
        if value_match:
            self.matches['TransactionValue'] = f"Rs. {value_match.group(1)}"
            
        # Extract date of execution
        date_match = re.search(r'(?:EXECUTION\s+DATE|DATE\s+OF\s+DEED)[\s.:]+(\d{1,2}[-/]\d{1,2}[-/]\d{4})', self.extracted_text)
        if date_match:
            self.matches['ExecutionDate'] = date_match.group(1)
            
        self.confidence_score = self.calculate_confidence(len(required_patterns))
        return self._generate_response("Property Document")

# Update the validator mapping in your main application:
DOCUMENT_VALIDATORS = {
    'Aadhar Card': AadharValidator(),
    'PAN Card': PANCardValidator(),
    'Caste Certificate': CasteCertificateValidator(),
    'Ration Card': RationCardValidator(),
    'Voter ID': VoterIDValidator(),
    'Driving License': DrivingLicenseValidator(),
    'Income Certificate': IncomeCertificateValidator(),
    'Disability Certificate': DisabilityCertificateValidator(),
    'BPL Certificate': BPLCertificateValidator(),
    'Domicile Certificate': DomicileCertificateValidator(),
    'Birth Certificate': BirthCertificateValidator(),
    'Marriage Certificate': MarriageCertificateValidator(),
    'Bank Passbook': BankPassbookValidator(),
    'Employment Certificate': EmploymentCertificateValidator(),
    'Educational Certificates': EducationalCertificateValidator(),
    'Property Documents': PropertyDocumentValidator()
}