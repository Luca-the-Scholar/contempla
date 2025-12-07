import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type EditType = "name" | "email" | "password";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editType: EditType;
  currentValue: string;
  onSuccess: () => void;
}

export function ProfileEditDialog({ 
  open, 
  onOpenChange, 
  editType, 
  currentValue,
  onSuccess 
}: ProfileEditDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newValue, setNewValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const titles: Record<EditType, string> = {
    name: "Change Display Name",
    email: "Change Email",
    password: "Change Password",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User not found");

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (authError) {
        throw new Error("Current password is incorrect");
      }

      if (editType === "name") {
        const { error } = await supabase
          .from("profiles")
          .update({ name: newValue })
          .eq("id", user.id);
        
        if (error) throw error;
        toast({ title: "Display name updated!" });
      } else if (editType === "email") {
        if (newValue !== confirmValue) {
          throw new Error("Email addresses don't match");
        }
        const { error } = await supabase.auth.updateUser({ email: newValue });
        if (error) throw error;
        toast({ title: "Confirmation email sent to your new address" });
      } else if (editType === "password") {
        if (newValue !== confirmValue) {
          throw new Error("Passwords don't match");
        }
        if (newValue.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        const { error } = await supabase.auth.updateUser({ password: newValue });
        if (error) throw error;
        toast({ title: "Password updated!" });
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword("");
    setNewValue("");
    setConfirmValue("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[editType]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              required
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-value">
              {editType === "name" ? "New Display Name" : 
               editType === "email" ? "New Email" : "New Password"}
            </Label>
            <Input
              id="new-value"
              type={editType === "password" ? "password" : editType === "email" ? "email" : "text"}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={
                editType === "name" ? "Enter new display name" :
                editType === "email" ? "Enter new email" : "Enter new password"
              }
              required
              className="min-h-[44px]"
            />
          </div>

          {(editType === "email" || editType === "password") && (
            <div className="space-y-2">
              <Label htmlFor="confirm-value">
                {editType === "email" ? "Confirm New Email" : "Confirm New Password"}
              </Label>
              <Input
                id="confirm-value"
                type={editType === "password" ? "password" : "email"}
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                placeholder={
                  editType === "email" ? "Confirm new email" : "Confirm new password"
                }
                required
                className="min-h-[44px]"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}