import { useState } from "react";
import { useAction } from "convex/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Mail, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";

export function TestEmailForm() {
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const sendTestEmail = useAction(api.sendEmails.sendTestEmailToAddress);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!toEmail) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendTestEmail({
        toEmail,
        subject: subject || undefined,
        message: message || undefined,
      });
      
      if (result.success) {
        toast.success(`${result.message} Check your inbox (and spam folder).`);
        // Reset form
        setToEmail("");
        setSubject("");
        setMessage("");
      }
    } catch (error) {
      console.error("Failed to send test email:", error);
      
      // Handle specific Resend validation errors
      if (error instanceof Error && error.message.includes("You can only send testing emails")) {
        toast.error("When using sandbox domain, you can only send to your Resend account email address. Please enter the email you used to sign up for Resend, or verify a custom domain.");
      } else if (error instanceof Error && error.message.includes("domain not verified")) {
        toast.error("Domain not verified. Either use 'onboarding@resend.dev' as sender email, or verify your custom domain in Resend dashboard.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to send test email");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Test Email Functionality
        </CardTitle>
        <CardDescription>
          Send a test email to verify your email configuration is working correctly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toEmail">To Email Address *</Label>
            <Input
              id="toEmail"
              type="email"
              placeholder="test@example.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Test Email from Kaizen"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Custom message for your test email..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              rows={4}
            />
          </div>
          
          <Button type="submit" disabled={isLoading} className="w-full min-w-[160px]">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Test Email
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 