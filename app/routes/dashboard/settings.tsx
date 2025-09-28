"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import SubscriptionStatus from "~/components/subscription-status";
import { NotionConnection } from "~/components/dashboard/notion-connection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Mail } from "lucide-react";
import { api } from "../../../convex/_generated/api";

export default function Page() {
  const emailPrefs = useQuery(api.users.getUserEmailPreference);
  const updateEmailPrefs = useMutation(api.users.updateEmailNotifications);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEmailToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      await updateEmailPrefs({ enabled });
      toast.success(enabled ? "Email notifications enabled" : "Email notifications disabled");
    } catch (error) {
      toast.error("Failed to update email preferences");
      console.error("Email preference update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="@container/main flex flex-1 flex-col gap-2 overflow-auto">
        <div className="flex flex-col gap-3 sm:gap-4 py-3 sm:py-4 md:gap-6 md:py-6 pb-16 md:pb-20">
          <div className="px-3 sm:px-4 lg:px-6 max-w-4xl mx-auto w-full">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your account and integrations</p>
              </div>

              <SubscriptionStatus />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Get your podcast summaries delivered to your inbox
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-summaries">Send summaries to email</Label>
                    <Switch
                      id="email-summaries"
                      checked={emailPrefs?.email_notifications ?? true}
                      onCheckedChange={handleEmailToggle}
                      disabled={isUpdating || emailPrefs === undefined}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    When enabled, you'll receive a beautifully formatted email with your summary and key takeaways after each podcast summary is generated.
                  </p>
                </CardContent>
              </Card>

              <NotionConnection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
