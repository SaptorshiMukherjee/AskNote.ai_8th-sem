import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Download, Bot, User, Sparkles, FileText, X, RefreshCw, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from './ChatSessionManager';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PDFViewer from '@/components/PDFViewer';
import { extractTextFromPDF } from '@/services/pdfService';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  pdfText?: string;
  pdfFile?: File | null;
}

const ChatInterface = ({ messages: initialMessages, onSendMessage, isLoading, pdfText, pdfFile }: ChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showPDF, setShowPDF] = useState(() => {
    // Try to restore the showPDF state from localStorage
    const savedState = localStorage.getItem('showPDF');
    return savedState ? JSON.parse(savedState) : false;
  });
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Save showPDF state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('showPDF', JSON.stringify(showPDF));
  }, [showPDF]);

  // Reset showPDF state when pdfFile changes
  useEffect(() => {
    if (!pdfFile) {
      setShowPDF(false);
    }
  }, [pdfFile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate suggested questions based on PDF content
  useEffect(() => {
    if (pdfText) {
      const questions = [
        'What is this document about?',
        'Can you summarize the main points?',
        'What are the main arguments presented?',
        'Are there any important dates or events mentioned?',
        'What are the conclusions or recommendations?'
      ];
      setSuggestedQuestions(questions);
    } else {
      setSuggestedQuestions([]);
    }
  }, [pdfText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading || !pdfText) {
      if (!pdfText) {
        toast({
          title: "No Document",
          description: "Please upload a document first to ask questions.",
          variant: "destructive"
        });
      }
      return;
    }
    
    const question = inputValue.trim();
    setInputValue('');
    
    try {
      await onSendMessage(question);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSuggestedQuestion = async (question: string) => {
    if (isLoading) return;
    
    try {
      await onSendMessage(question);
    } catch (error) {
      console.error('Error sending suggested question:', error);
      toast({
        title: "Error",
        description: "Failed to process the question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadChat = () => {
    const chatContent = messages
      .map(msg => `${msg.sender === 'user' ? 'You' : 'AskNoteBot'}: ${msg.text}\n`)
      .join('\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-history.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="flex-none flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h2>
            {pdfFile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPDF(!showPDF)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <FileText className="h-4 w-4" />
                {showPDF ? 'Hide PDF' : 'View PDF'}
              </Button>
            )}
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadChat}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <Download className="h-4 w-4" />
                Download Chat
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
              Clear Chat
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Messages */}
          <div className={`flex flex-col ${showPDF && pdfFile ? 'w-1/2' : 'w-full'}`}>
            <ScrollArea className="flex-1">
              <div className="px-4 py-2">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center p-4 rounded-lg max-w-md">
                        <MessageSquare className="mx-auto h-10 w-10 text-blue-600 dark:text-blue-500 mb-3 opacity-80" />
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Start a conversation</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {pdfText ? 'Ask questions about your document to get started' : 'Upload a document to start chatting'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-start gap-4 ${message.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
                        >
                          {message.sender === 'bot' && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarFallback className="bg-blue-600 text-white">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`group relative flex flex-col max-w-[85%] ${message.sender === 'bot' ? 'items-start' : 'items-end'}`}
                          >
                            <div
                              className={`px-4 py-3 rounded-2xl ${
                                message.sender === 'bot'
                                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm'
                                  : 'bg-blue-600 text-white rounded-tr-sm'
                              }`}
                            >
                              <div className={`prose ${message.sender === 'user' ? 'prose-invert' : 'dark:prose-invert'} max-w-none`}>
                                <ReactMarkdown>{message.text}</ReactMarkdown>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {message.sender === 'user' && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex items-start gap-4 justify-start">
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-blue-600 text-white">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="group relative flex flex-col max-w-[85%] items-start">
                            <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-100" />
                                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-200" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex-none flex items-center px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
              <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
                <div className="flex items-center gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={pdfText ? "Ask a question..." : "Upload a document to start chatting..."}
                    disabled={isLoading || !pdfText}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                  <Button 
                    type="submit"
                    size="sm"
                    disabled={isLoading || !pdfText || !inputValue.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* PDF Viewer */}
          {showPDF && pdfFile && (
            <div className="w-1/2 border-l border-gray-100 dark:border-gray-800 flex flex-col h-full min-h-0">
              <div className="flex-none flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {pdfFile.name}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPDF(false)}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 min-h-0 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                <PDFViewer file={pdfFile} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Questions Panel */}
      {pdfText && suggestedQuestions.length > 0 && !showPDF && (
        <div className="w-72 flex flex-col">
          <div className="flex-none flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Suggested Questions</h3>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {suggestedQuestions.map((question, index) => (
                <TooltipProvider key={index}>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left p-3 h-auto bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                        onClick={() => handleSuggestedQuestion(question)}
                        disabled={isLoading}
                      >
                        <div className="flex gap-3 items-start w-full">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-sm truncate">
                            {question.length > 50 ? `${question.substring(0, 50)}...` : question}
                          </span>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="left" 
                      className="max-w-[300px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-3"
                    >
                      <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-normal">{question}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
