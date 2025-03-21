// components/BookmarkComponent.tsx

import React, { useEffect, useState } from "react";
import { Bookmark as BookmarkIcon } from "lucide-react"; 
import { Bookmarks } from "../types/Bookmarks"; 
import { schemes } from "../data/schemes";
import { useTranslation } from "@/app/lib/TranslationContext"; 

const BookmarkComponent: React.FC = () => {
    const [bookmarkedSchemes, setBookmarkedSchemes] = useState<Bookmarks[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { t } = useTranslation();

    useEffect(() => {
        const fetchBookmarks = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                console.error("No token found, cannot fetch bookmarks.");
                return; // Optionally redirect to login
            }

            try {
                const response = await fetch("http://localhost:3000/api/bookmarks", {
                    headers: {
                        "x-auth-token": token,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: Bookmarks[] = await response.json();
                setBookmarkedSchemes(data);
            } catch (err) {
                console.error("Error fetching bookmarks:", err);
                setError("Failed to load bookmarks");
            } finally {
                setLoading(false);
            }
        };

        fetchBookmarks();
    }, []);

    const handleRemoveBookmark = async (bookmarkId: string) => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("No token found, cannot remove bookmark.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/bookmarks/${bookmarkId}`, {
                method: "DELETE",
                headers: {
                    "x-auth-token": token,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Remove the bookmark from the state
            setBookmarkedSchemes((prev) => prev.filter((b) => b._id !== bookmarkId));
        } catch (err) {
            console.error("Error removing bookmark:", err);
        }
    };

    if (loading) return <p>{t('loadingbookmars')}</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            {/* <h2 className="text-2xl font-bold mb-4">My Bookmarks</h2> */}
            {bookmarkedSchemes.length === 0 ? (
                <p>{t('nobookmarksfound')}</p>
            ) : (
                <ul>
                    {bookmarkedSchemes.map((bookmark) => {
                        // Find the corresponding scheme
                        const scheme = schemes.find(s => s.id === bookmark.schemeId);
                        return (
                            <li key={bookmark._id} className="flex justify-between items-center mb-2">
                                <div className="flex items-center">
                                    <BookmarkIcon className="mr-2 text-blue-600" />
                                    {scheme ? (
                                        <span>{scheme.name} - {scheme.description}</span>
                                    ) : (
                                        <span>{t('schemenotfound')}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleRemoveBookmark(bookmark._id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    {t('remove')}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default BookmarkComponent;