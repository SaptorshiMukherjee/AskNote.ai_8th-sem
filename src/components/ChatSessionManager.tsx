import React, { useState, useEffect } from 'react';
import { Trash2, FileText, Plus, BookOpen, HelpCircle, ListOrdered, BookmarkIcon, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import DocumentUploader from '@/components/DocumentUploader';
import { useToast } from '@/hooks/use-toast';

export interface StudyMaterial {
  summary?: string;
  suggestedQuestions?: Array<{
    question: string;
    pageReference?: number;
    sectionReference?: string;
  }>;
  breakdown?: Array<{
    title: string;
    content: string;
    pageReference?: number;
  }>;
  practiceQuestions?: Array<{
    question: string;
    difficulty: 'easy' | 'medium' | 'hard';
    pageReference?: number;
  }>;
  studyGuide?: Array<{
    topic: string;
    keyPoints: string[];
    pageReference?: number;
  }>;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  documentName?: string;
  createdAt: Date;
  studyMaterial?: StudyMaterial;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatSessionManagerProps {
  onFileUpload: (file: File, sessionId?: string) => Promise<void>;
  isLoading: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onDeleteAllSessions: () => void;
}

const MAX_SESSIONS = 20;

const ChatSessionManager: React.FC<ChatSessionManagerProps> = ({
  onFileUpload,
  isLoading,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateNewSession,
  onDeleteSession,
  onDeleteAllSessions
}) => {
  const { toast } = useToast();
  const [sessionUploaders, setSessionUploaders] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Store active session's PDF file in localStorage when it changes
  useEffect(() => {
    if (activeSessionId) {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession?.documentName) {
        localStorage.setItem('lastActivePDF', activeSession.documentName);
      }
    }
  }, [activeSessionId, sessions]);

  // Toggle file uploader for a specific session
  const toggleSessionUploader = (sessionId: string) => {
    setSessionUploaders(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get session name or fallback to date
  const getSessionName = (session: ChatSession): string => {
    if (session.name && session.name !== 'New Chat') {
      return session.name;
    }
    
    // Get first user question as name if available
    const firstQuestion = session.messages.find(m => m.sender === 'user')?.text;
    if (firstQuestion) {
      // Truncate if too long
      return firstQuestion.length > 20 
        ? firstQuestion.substring(0, 20) + '...' 
        : firstQuestion;
    }
    
    // Fallback to document name or date
    return session.documentName || `Chat ${formatDate(session.createdAt)}`;
  };

  // Handle file upload for a specific session
  const handleFileUploadForSession = async (file: File, sessionId?: string) => {
    try {
      await onFileUpload(file, sessionId);
      // Store the file name in localStorage
      localStorage.setItem('lastActivePDF', file.name);
      // Close the uploader after successful upload
      if (sessionId) {
        setSessionUploaders(prev => ({ ...prev, [sessionId]: false }));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload the document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleNewSession = () => {
    if (sessions.length >= MAX_SESSIONS) {
      setSessionError(`Cannot create more than ${MAX_SESSIONS} sessions. Please delete some existing sessions.`);
      setTimeout(() => setSessionError(null), 3000);
      return;
    }
    onCreateNewSession();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background dark:bg-gray-950">
      {/* Main Document Uploader */}
      <div className="flex-none border-b border-blue-100 dark:border-blue-900 p-3">
        <h3 className="text-sm font-medium mb-1 text-foreground dark:text-white">Upload Document</h3>
        <div className="h-[280px]">
          <DocumentUploader 
            onFileUpload={(file) => handleFileUploadForSession(file)} 
            isLoading={isLoading}
          />
        </div>
      </div>
      
      {/* Chat History Section */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-blue-100 dark:border-blue-900">
          <h3 className="text-sm font-medium text-foreground dark:text-white">
            Chat History ({sessions.length}/{MAX_SESSIONS})
          </h3>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNewSession}
              disabled={isLoading}
              className="dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onDeleteAllSessions}
              disabled={isLoading || sessions.length === 0}
              className="text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {sessionError && (
          <div className="text-center text-sm text-red-500 dark:text-red-400 py-2 px-4">
            {sessionError}
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-16rem)] p-3 dark:bg-gray-950">
          <div className="space-y-2 dark:bg-gray-950">
            {sessions.map(session => (
              <div key={session.id}>
                <div 
                  className={`group p-2 rounded-md flex items-center justify-between cursor-pointer 
                    hover:bg-gray-100 dark:hover:bg-blue-900/30
                    ${activeSessionId === session.id 
                      ? 'bg-blue-50 dark:bg-blue-900/50 border-l-2 border-blue-500 dark:border-blue-400' 
                      : ''
                    }`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="flex items-center truncate flex-1">
                    <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 dark:text-blue-400" />
                    <span className="truncate text-sm text-foreground dark:text-blue-100">
                      {getSessionName(session)}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 dark:hover:bg-blue-900/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-red-500 dark:text-red-400" />
                  </Button>
                </div>

                {/* Study Material Section */}
                {activeSessionId === session.id && session.studyMaterial && (
                  <div className="ml-6 mt-3 space-y-6 text-sm">
                    {/* Container with gradient border */}
                    <div className="relative p-4 rounded-lg bg-gradient-to-r from-blue-50 to-white dark:from-gray-900 dark:to-gray-900/90 shadow-sm">
                      {/* Decorative elements */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-t-lg" />
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500/20 to-transparent rounded-l-lg" />

                      {/* Summary Section */}
                      {session.studyMaterial.summary && (
                        <div className="space-y-3 mb-6">
                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center">
                            <BookOpen className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                            Document Summary
                          </h4>
                          <div className="relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-200 dark:bg-blue-800 rounded-full" />
                            <p className="text-gray-700 dark:text-blue-200 text-base leading-relaxed pl-6">
                              {session.studyMaterial.summary}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Suggested Questions Section */}
                      {session.studyMaterial.suggestedQuestions && (
                        <div className="space-y-4 mb-6">
                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center">
                            <HelpCircle className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                            Key Questions to Explore
                          </h4>
                          <ul className="space-y-3 pl-4">
                            {session.studyMaterial.suggestedQuestions.map((item, idx) => (
                              <li 
                                key={idx}
                                className="group relative transform transition-all duration-200 hover:-translate-y-0.5"
                              >
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition-colors">
                                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                                    {idx + 1}
                                  </span>
                                  <div className="space-y-1.5 flex-1">
                                    <p className="text-gray-800 dark:text-blue-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer transition-colors text-base">
                                      {item.question}
                                    </p>
                                    {(item.pageReference || item.sectionReference) && (
                                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Link2 className="h-3 w-3" />
                                        {item.pageReference && (
                                          <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                            Page {item.pageReference}
                                          </span>
                                        )}
                                        {item.sectionReference && (
                                          <>
                                            {item.pageReference && <span>•</span>}
                                            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                              {item.sectionReference}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Breakdown Section */}
                      {session.studyMaterial.breakdown && (
                        <div className="space-y-4 mb-6">
                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center">
                            <ListOrdered className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                            Content Breakdown
                          </h4>
                          <div className="grid gap-4 pl-4">
                            {session.studyMaterial.breakdown.map((item, idx) => (
                              <div 
                                key={idx} 
                                className="p-4 rounded-lg bg-white dark:bg-gray-800/30 shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                                    {idx + 1}
                                  </span>
                                  <h5 className="font-medium text-gray-900 dark:text-blue-300 flex items-center gap-2 flex-1">
                                    {item.title}
                                    {item.pageReference && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                        <Link2 className="h-3 w-3" />
                                        Page {item.pageReference}
                                      </span>
                                    )}
                                  </h5>
                                </div>
                                <p className="text-gray-600 dark:text-blue-200 pl-9">
                                  {item.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Study Guide Section */}
                      {session.studyMaterial.studyGuide && (
                        <div className="space-y-4 mb-6">
                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center">
                            <BookmarkIcon className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                            Study Guide
                          </h4>
                          <div className="grid gap-6 pl-4">
                            {session.studyMaterial.studyGuide.map((item, idx) => (
                              <div 
                                key={idx} 
                                className="relative p-4 rounded-lg bg-white dark:bg-gray-800/30 shadow-sm"
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                                    {idx + 1}
                                  </span>
                                  <h5 className="font-medium text-gray-900 dark:text-blue-300 flex items-center gap-2 flex-1">
                                    {item.topic}
                                    {item.pageReference && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                        <Link2 className="h-3 w-3" />
                                        Page {item.pageReference}
                                      </span>
                                    )}
                                  </h5>
                                </div>
                                <ul className="space-y-2 pl-9">
                                  {item.keyPoints.map((point, pointIdx) => (
                                    <li 
                                      key={pointIdx} 
                                      className="flex items-start gap-2 text-gray-600 dark:text-blue-200"
                                    >
                                      <span className="text-blue-500 dark:text-blue-400">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Questions Section */}
                      {session.studyMaterial.practiceQuestions && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center">
                            <HelpCircle className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                            Practice Questions
                          </h4>
                          <ul className="grid gap-4 pl-4">
                            {session.studyMaterial.practiceQuestions.map((item, idx) => (
                              <li 
                                key={idx}
                                className="group transform transition-all duration-200 hover:-translate-y-0.5"
                              >
                                <div className="p-4 rounded-lg bg-white dark:bg-gray-800/30 shadow-sm">
                                  <div className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                                      {idx + 1}
                                    </span>
                                    <div className="space-y-2 flex-1">
                                      <p className="text-gray-800 dark:text-blue-200 text-base">
                                        {item.question}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-white ${
                                            item.difficulty === 'easy'
                                              ? 'bg-green-500'
                                              : item.difficulty === 'medium'
                                              ? 'bg-yellow-500'
                                              : 'bg-red-500'
                                          }`}
                                        >
                                          {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                                        </span>
                                        {item.pageReference && (
                                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                            <Link2 className="h-3 w-3" />
                                            Page {item.pageReference}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatSessionManager;