"use client";
import React from 'react';
import { useRouter } from 'next/navigation';

const AboutUs: React.FC = () => {
    const router = useRouter();

    const handleKnowMore = () => {
        router.push('/insights');
    };

    return (
        <div className="flex flex-col-reverse md:flex-row items-center justify-between px-6 py-10 bg-white">
            {/* Text Section */}
            <div className="md:w-1/2 text-center md:text-left mt-6 md:mt-0 md:pr-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">About Our Platform</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                Digital Seva is an AI-powered platform that streamlines access to government schemes, especially for rural citizens. It simplifies eligibility verification, automates document processing, and provides personalized scheme recommendations. Key features include an AI chatbot for 24/7 assistance, multilingual support, OCR-based document verification, and secure document management. The platform eliminates physical barriers by providing seamless digital access, ensuring faster processing & greater convenience for users.
                </p>
                <button 
                    onClick={handleKnowMore} 
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                >
                    Know More
                </button>
            </div>

            {/* Image Section */}
            <div className="md:w-1/2 flex justify-center">
                <img 
                    src="priya.jpg" 
                    alt="About Us" 
                    className="w-64 h-auto rounded-xl shadow-lg object-cover"
                />
            </div>
        </div>
    );
};

export default AboutUs;
