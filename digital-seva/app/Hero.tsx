// digital-seva\app\Hero.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  UserCircle,
  Bell,
  HelpCircle,
  Layout,
  ArrowRight,
  Loader,
  Bot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "./lib/TranslationContext";
import Navbar from "./components/Navbar";
import { AIAssistant } from "./components/AIAssistant";
import { useUser } from "./hooks/useUser";
import HeroComponent from "./main";
import FAQSection from "./faq";
import Footer from "./footer";
import AboutUs from './about/AboutUs'; 

// Define interfaces for type safety
interface Notification {
  id: string;
  message: string;
  isNew: boolean;
}

interface UserProfile {
  income: number;
  location: string;
  familySize: number;
  name?: string;
  age?: number;
  sex?: string;
  maritalStatus?: string;
  documents?: string[];
}

const CitizenServices = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    income: 0,
    location: "",
    familySize: 0,
  });
  const { user, loading } = useUser();
  const { t } = useTranslation();

  // Quick Links data
  const quickLinks = [
    {
      title: t("findSchemes"),
      description: t("findSchemesDesc"),
      icon: <Layout className="h-7 w-7" />,
      href: "/schemes",
      color: "bg-blue-500",
    },
    {
      title: t("documentmanagement"),
      description: t("documentmanagementDesc"),
      icon: <FileText className="h-7 w-7" />,
      href: "/Document_Management_System",
      color: "bg-green-500",
    },
    {
      title: t("nithya"),
      description: t("nithyaDesc"),
      icon: <Bot className="h-7 w-7" />,
      href: "/Nithya",
      color: "bg-purple-500",
    },
  ];

  // Load user profile from localStorage and API
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // First try to get from localStorage
        const savedProfile = localStorage.getItem("userProfile");
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          setUserProfile(parsed);
        }

        // Then fetch from API to get latest data
        const response = await fetch("/api/auth/profile");
        if (response.ok) {
          const profileData = await response.json();
          setUserProfile(profileData);
          // Update localStorage with latest data
          localStorage.setItem("userProfile", JSON.stringify(profileData));
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  // Save user profile to localStorage
  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(userProfile));
  }, [userProfile]);

  // Sample notifications data
  useEffect(() => {
    // Simulate fetching notifications
    const sampleNotifications: Notification[] = [
      {
        id: "1",
        message: "New scheme available in your area",
        isNew: true,
      },
      {
        id: "2",
        message: "Your profile is 70% complete",
        isNew: false,
      },
    ];
    setNotifications(sampleNotifications);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Navbar />

      <main className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-12">
        <div className=" -mt-10 text-center">
          <HeroComponent />
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {quickLinks.map((link, index) => (
            <Link href={link.href} key={index}>
              <Card className="hover:shadow-xl transition-all cursor-pointer h-full border border-gray-200 rounded-lg">
                <CardContent className="p-6">
                  <div
                    className={`${link.color} w-12 h-12 rounded-full flex items-center justify-center text-white mb-6`}
                  >
                    {link.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-[#1F2937]">
                    {link.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{link.description}</p>
                  <div className="flex items-center text-blue-600 font-medium">
                    {t("learnMore")} <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* AI Assistant Card */}
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader className="animate-spin" />
          </div>
        ) : (
          <AIAssistant user={user || {}} />
        )}

        {/* <ResearchCharts /> */}
        <AboutUs />
        
        <FAQSection />
        <Footer />
      </main>
    </div>
  );
};

export default CitizenServices;
