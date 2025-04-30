import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { generateAnswer } from '@/services/aiService';
import { findRelevantContext, extractTextFromPDF } from '@/services/pdfService';
import { useToast } from '@/hooks/use-toast';
import ChatInterface from '@/components/ChatInterface';
import ChatSessionManager, { ChatSession, ChatMessage } from '@/components/ChatSessionManager';
import { v4 as uuidv4 } from 'uuid';

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Session states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Documents state - map session ID to its document content
  const [sessionDocuments, setSessionDocuments] = useState<Record<string, {text: string, name: string}>>({});
  const [sessionPDFs, setSessionPDFs] = useState<Record<string, File>>({});

  // Get active session
  const activeSession = sessions.find(session => session.id === activeSessionId) || null;
  
  // Get active document text
  const activePdfText = activeSessionId ? sessionDocuments[activeSessionId]?.text || '' : '';
  
  // Get active PDF file
  const activePdfFile = activeSessionId ? sessionPDFs[activeSessionId] || null : null;
  
  // Initialize with welcome message and restore PDF files when component mounts
  useEffect(() => {
    const loadSessions = () => {
      // Load sessions from localStorage if available
      const savedSessions = localStorage.getItem('chatSessions');
      if (savedSessions) {
        try {
          const parsedSessions = JSON.parse(savedSessions) as ChatSession[];
          
          // Convert string dates back to Date objects
          const sessionsWithDates = parsedSessions.map(session => ({
            ...session,
            createdAt: new Date(session.createdAt),
            messages: session.messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }));
          
          setSessions(sessionsWithDates);
          
          // Load documents if available
          const savedDocuments = localStorage.getItem('sessionDocuments');
          if (savedDocuments) {
            setSessionDocuments(JSON.parse(savedDocuments));
          }

          // Try to restore the last active session
          const lastActiveSessionId = localStorage.getItem('lastActiveSessionId');
          if (lastActiveSessionId && sessionsWithDates.some(s => s.id === lastActiveSessionId)) {
            setActiveSessionId(lastActiveSessionId);
          } else if (sessionsWithDates.length > 0) {
            // Fallback to most recent session
            const mostRecent = sessionsWithDates.sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
            )[0];
            setActiveSessionId(mostRecent.id);
          }
        } catch (e) {
          console.error("Error loading saved sessions:", e);
          // If error in parsing, start fresh
        }
      }
    };
    
    loadSessions();
  }, []);
  
  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);
  
  // Save documents to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(sessionDocuments).length > 0) {
      localStorage.setItem('sessionDocuments', JSON.stringify(sessionDocuments));
    }
  }, [sessionDocuments]);

  // Save active session ID whenever it changes
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('lastActiveSessionId', activeSessionId);
    }
  }, [activeSessionId]);

  // Create a new chat session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      name: 'New Chat',
      messages: [{
        id: uuidv4(),
        text: '👋 Hello! I am AskNoteBot. I can help you understand your document better. What would you like to know?',
        sender: 'bot',
        timestamp: new Date()
      }],
      createdAt: new Date()
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // Handle file upload
  const handleFileUpload = async (file: File, sessionId?: string) => {
    setIsLoading(true);
    
    try {
      if (!file) {
        throw new Error('No file selected');
      }

      if (file.size === 0) {
        throw new Error('The selected file is empty');
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File size too large. Please upload a PDF smaller than 50MB');
      }

      // Extract text from PDF
      const result = await extractTextFromPDF(file);
      
      if (!result || !result.fullText) {
        throw new Error('Could not extract text from the PDF. The file might be corrupted or password protected.');
      }

      // Determine which session to use
      let targetSessionId = sessionId;
      
      if (!targetSessionId) {
        // Create new session if uploading to main uploader
        const newSessionId = uuidv4();
        const newSession: ChatSession = {
          id: newSessionId,
          name: file.name.split('.')[0] || 'New Chat',
          documentName: file.name,
          messages: [{
            id: uuidv4(),
            text: '👋 Hello! I am AskNoteBot. I can help you understand your document better. What would you like to know?',
            sender: 'bot',
            timestamp: new Date()
          }],
          createdAt: new Date()
        };
        
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSessionId);
        targetSessionId = newSessionId;
      }
      
      // Store document text and file
      setSessionDocuments(prev => ({
        ...prev,
        [targetSessionId]: { text: result.fullText, name: file.name }
      }));
      
      // Store PDF file
      setSessionPDFs(prev => ({
        ...prev,
        [targetSessionId]: file
      }));
      
      toast({
        title: "Success",
        description: "Document uploaded successfully. Ready to chat!",
      });
    } catch (error) {
      console.error('Error processing document:', error);
      
      // Get a user-friendly error message
      let errorMessage = 'Failed to process the document. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

      // Clean up any partial session that might have been created
      if (sessionId) {
        setSessionDocuments(prev => {
          const newDocs = { ...prev };
          delete newDocs[sessionId];
          return newDocs;
        });
        setSessionPDFs(prev => {
          const newPDFs = { ...prev };
          delete newPDFs[sessionId];
          return newPDFs;
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Send a chat message and get response
  const handleSendMessage = async (question: string) => {
    if (!activeSessionId) {
      // Create a session if none exists
      createNewSession();
      return;
    }
    
    setIsLoading(true);
    
    // Add user message to the current session
    const userMessage: ChatMessage = {
      id: uuidv4(),
      text: question,
      sender: 'user',
      timestamp: new Date()
    };
    
    setSessions(prev => prev.map(session => 
      session.id === activeSessionId
        ? { ...session, messages: [...session.messages, userMessage] }
        : session
    ));
    
    try {
      const documentText = sessionDocuments[activeSessionId]?.text || '';
      if (!documentText) {
        throw new Error('No document available');
      }
      
      const { context, pages } = findRelevantContext(documentText, [], question);
      const answer = await generateAnswer(context, pages, question);
      
      // Add bot response to the conversation
      const botMessage: ChatMessage = {
        id: uuidv4(),
        text: answer,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setSessions(prev => prev.map(session => 
        session.id === activeSessionId
          ? { ...session, messages: [...session.messages, botMessage] }
          : session
      ));
    } catch (error) {
      console.error('Error answering question:', error);
      
      toast({
        title: "Error",
        description: "Failed to process your question. Please try again.",
        variant: "destructive"
      });
      
      // Add error message to the conversation
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        text: "I encountered an error while processing your question. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setSessions(prev => prev.map(session => 
        session.id === activeSessionId
          ? { ...session, messages: [...session.messages, errorMessage] }
          : session
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a single chat session
  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setSessionDocuments(prev => {
      const newDocs = { ...prev };
      delete newDocs[sessionId];
      return newDocs;
    });
    setSessionPDFs(prev => {
      const newPDFs = { ...prev };
      delete newPDFs[sessionId];
      return newPDFs;
    });

    // If deleting active session, switch to most recent remaining session
    if (sessionId === activeSessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        const mostRecent = remainingSessions.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )[0];
        setActiveSessionId(mostRecent.id);
        localStorage.setItem('lastActiveSessionId', mostRecent.id);
      } else {
        setActiveSessionId(null);
        localStorage.removeItem('lastActiveSessionId');
      }
    }
    
    toast({
      title: "Chat Deleted",
      description: "The chat session has been removed.",
    });
  };

  // Delete all chat sessions
  const deleteAllSessions = () => {
    setSessions([]);
    setSessionDocuments({});
    setSessionPDFs({});
    setActiveSessionId(null);
    localStorage.removeItem('lastActiveSessionId');
    localStorage.removeItem('sessionDocuments');
    localStorage.removeItem('chatSessions');
    
    toast({
      title: "All Chats Deleted",
      description: "All chat sessions have been removed.",
    });
  };

  // Select a chat session
  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    localStorage.setItem('lastActiveSessionId', sessionId);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden h-[calc(100vh-4rem)]">
          <ChatSessionManager
            onFileUpload={handleFileUpload}
            isLoading={isLoading}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={selectSession}
            onCreateNewSession={createNewSession}
            onDeleteSession={deleteSession}
            onDeleteAllSessions={deleteAllSessions}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b p-4 flex justify-between items-center h-16">
            <Button 
              variant="ghost" 
              className="flex items-center text-gray-600 dark:text-gray-300"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-lg font-medium dark:text-white">
              {activeSession?.name || 'AskNoteBot'}
            </div>
            <div className="w-24"></div> {/* Spacer for alignment */}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeSessionId ? (
              <ChatInterface 
                messages={activeSession?.messages || []}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                pdfText={activePdfText}
                pdfFile={activePdfFile}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-8 rounded-lg max-w-md">
                  <h3 className="text-xl font-semibold mb-2 dark:text-white">
                    Please upload a document or create a new chat
                  </h3>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
