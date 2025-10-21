import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TranslateButton } from '@/components/TranslateButton';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({});

  useEffect(() => {
    console.log('AIChatbot mounted, isOpen:', isOpen);
  }, []);

  useEffect(() => {
    console.log('isOpen changed to:', isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      console.log('=== Chatbot Debug ===');
      console.log('Sending message:', userMessage);
      console.log('Conversation ID:', conversationId);
      
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session:', session ? 'exists' : 'null', sessionError);
      
      if (!session) {
        throw new Error('Not authenticated. Please log in.');
      }
      
      const { data, error } = await supabase.functions.invoke('ai-chatbot', {
        body: { conversationId, message: userMessage }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to send message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      if (!data) {
        throw new Error('No response from chatbot');
      }

      if (!conversationId && data.conversationId) {
        console.log('Setting conversation ID:', data.conversationId);
        setConversationId(data.conversationId);
      }

      console.log('AI response:', data.message);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    console.log('Toggle clicked! Current isOpen:', isOpen, 'New value:', !isOpen);
    setIsOpen(!isOpen);
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <Button
            onClick={handleToggle}
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <Card className="w-96 h-[600px] flex flex-col shadow-2xl bg-background">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <h3 className="font-semibold">Support Chat</h3>
              </div>
              <Button onClick={handleToggle} variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Hi! How can I help you today?</p>
                  <p className="text-sm mt-2">Ask about products, orders, or anything else!</p>
                </div>
              )}
              
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {translatedMessages[index] || message.content}
                      </p>
                    </div>
                    {message.content.length > 20 && (
                      <div className="px-1">
                        <TranslateButton
                          text={message.content}
                          context="chat message"
                          size="sm"
                          onTranslated={(translated) => {
                            setTranslatedMessages(prev => ({
                              ...prev,
                              [index]: translated
                            }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};
