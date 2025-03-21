"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { useTranslation } from "@/app/lib/TranslationContext";
import Navbar from '../components/Navbar';
import { useRouter } from "next/navigation";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#FF8042"];

const ResearchCharts = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const dataBarriers = [
    { name: t("documentVerificationIssues"), value: 65 },
    { name: t("lackOfAwareness"), value: 20 },
    { name: t("transportationIssues"), value: 10 },
    { name: t("languageTechBarriers"), value: 5 },
  ];

  const dataEfficiency = [
    { process: t("docVerification"), Traditional: 7, "AI-Powered": 0.08 },
    { process: t("eligibilityCheck"), Traditional: 21, "AI-Powered": 0.01 },
    { process: t("formFilling"), Traditional: 90, "AI-Powered": 10 },
    { process: t("applicationProcessing"), Traditional: 56, "AI-Powered": 3 },
  ];

  const dataProcessingTime = [
    { name: t("schemeDiscovery"), Traditional: 14, "AI-Powered": 0.03 },
    { name: t("docSubmission"), Traditional: 3, "AI-Powered": 1 },
    { name: t("approvalCycle"), Traditional: 45, "AI-Powered": 7 },
  ];

  const dataUserSatisfaction = [
    { name: t("satisfied"), value: 78 },
    { name: t("neutral"), value: 15 },
    { name: t("dissatisfied"), value: 7 },
  ];

  const dataApprovalRate = [
    { metric: t("firstTimeSuccess"), Traditional: 32, "AI-Powered": 89 },
    { metric: t("rejectionDueToDocs"), Traditional: 41, "AI-Powered": 6 },
    { metric: t("avgAttemptsNeeded"), Traditional: 2.7, "AI-Powered": 1.1 },
  ];

  const dataTimeCostSavings = [
    { name: t("eligibilityCheckSavings"), Traditional: 18, "AI-Powered": 0 },
    { name: t("docErrorsSavings"), Traditional: 6.2, "AI-Powered": 0.5 },
    { name: t("travelSavings"), Traditional: 4.7, "AI-Powered": 0 },
    { name: t("processingSavings"), Traditional: 4200, "AI-Powered": 380 },
  ];

  const dataPerformanceComparison = [
    { parameter: t("avgResolutionTime"), Traditional: 34, DigitalSeva: 2.8 },
    { parameter: t("citizenEffortScore"), Traditional: 4.1, DigitalSeva: 8.7 },
    { parameter: t("operationalCost"), Traditional: 650, DigitalSeva: 90 },
    { parameter: t("geoCoverage"), Traditional: 38, DigitalSeva: 89 },
  ];

  const dataRejectionReasons = [
    { name: t("incompleteDocuments"), value: 48 },
    { name: t("eligibilityConfusion"), value: 22 },
    { name: t("missedDeadlines"), value: 15 },
    { name: t("formFillingErrors"), value: 10 },
    { name: t("duplicateApplications"), value: 5 },
  ];

  const dataAIImprovements = [
    { name: t("documentErrorsReduction"), value: 93 },
    { name: t("eligibilityMisunderstandingsReduction"), value: 88 },
    { name: t("deadlineComplianceImprovement"), value: 79 },
    { name: t("formErrorElimination"), value: 95 },
    { name: t("duplicatePrevention"), value: 100 },
  ];

  return (
    <div className="container min-h-screen bg-gray-50">
      <Navbar />
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition duration-300 p-4 mb-4"
        aria-label="Back to Home"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-lg font-medium">{t("backtohome")}</span>
      </button>
      <h2 className="text-3xl font-bold mb-4 text-Black-600">{t("graphtitle")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("barriersTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dataBarriers}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataBarriers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("efficiencyTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataEfficiency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="process" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Traditional" fill="#8884d8" />
                <Bar dataKey="AI-Powered" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("processingTimeTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataProcessingTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Traditional" fill="#8884d8" />
                <Bar dataKey="AI-Powered" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("userSatisfactionTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dataUserSatisfaction}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataUserSatisfaction.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("approvalRateTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataApprovalRate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Traditional" fill="#8884d8" />
                <Bar dataKey="AI-Powered" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("timeCostSavingsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataTimeCostSavings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Traditional" fill="#8884d8" />
                <Bar dataKey="AI-Powered" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("rejectionReasonsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dataRejectionReasons}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataRejectionReasons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4">
              <h4 className="font-semibold">{t("afterAIImplementation")}</h4>
              <ul className="list-disc pl-5">
                {dataAIImprovements.map((entry, index) => (
                  <li key={index}>{entry.value}% {entry.name}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("performanceComparisonTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataPerformanceComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="parameter" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Traditional" fill="#8884d8" />
                <Bar dataKey="DigitalSeva" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResearchCharts;