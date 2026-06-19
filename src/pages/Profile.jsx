import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Mail, Phone, Home, Banknote, Bell, ShieldCheck, KeyRound, Edit, Save, X, CreditCard, Wallet, Camera, Loader2 } from "lucide-react";
import TwoFactorSetup from "@/components/security/TwoFactorSetup";
import LoadingSpinner from "@/components/LoadingSpinner";

const ProfileSection = ({ title, icon, children }) => (
  <Card className="bg-card border border-[#ccab6c]/30">
    <CardHeader className="flex flex-row items-center gap-3 pb-3">
      {icon}
      <CardTitle className="text-foreground text-base sm:text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

const InfoRow = ({ label, value, icon }) => (
  <div className="flex items-start gap-3">
    <div className="text-gold/90 mt-0.5 flex-shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gold/90">{label}</p>
      <p className="text-foreground font-medium text-sm break-words">{value || '-'}</p>
    </div>
  </div>
);

const EditRow = ({ label, value, name, onChange, icon }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split('.');
    onChange(keys, value);
  };
  return (
    <div className="flex items-start gap-3">
      <div className="text-gold/90 mt-8 flex-shrink-0">{icon}</div>
      <div className="flex-1 space-y-1 min-w-0">
        <Label htmlFor={name} className="text-xs text-gold/90">{label}</Label>
        <Input id={name} name={name} value={value || ''} onChange={handleChange} className="bg-muted border-[#ccab6c]/20 text-foreground text-sm" />
      </div>
    </div>
  );
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editableUser, setEditableUser] = useState({});
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    sms_notifications: false,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop();
      const newPath = `${authUser.id}/avatar.${ext}`;
      if (user?.avatar_url) {
        const oldPath = user.avatar_url.split('/avatars/')[1];
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
      }
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(newPath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(newPath);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      await User.updateMyUserData({ avatar_url: avatarUrl });
      setUser(prev => ({ ...prev, avatar_url: avatarUrl }));
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      setEditableUser(JSON.parse(JSON.stringify(userData)));
      setPreferences(userData.preferences || preferences);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (keys, value) => {
    setEditableUser(prev => {
      let updated = { ...prev };
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const isProfileComplete = (data) => !!(
    data.full_name?.trim() && data.phone?.trim() && data.national_id?.trim() &&
    data.address?.street?.trim() && data.address?.city?.trim() && data.address?.country?.trim()
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      const { full_name, phone, address, bank_details, national_id } = editableUser;
      const updatePayload = { full_name, phone, address, bank_details, national_id };
      if (isProfileComplete(editableUser)) updatePayload.kyc_status = 'verified';
      await User.updateMyUserData(updatePayload);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving user data:", error);
    } finally {
      loadUserData();
    }
  };

  const handlePreferenceChange = async (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    try {
      await User.updateMyUserData({ preferences: newPreferences });
    } catch (error) {
      console.error("Error updating preferences:", error);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your profile..." />;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Profile Header */}
        <Card className="bg-card border border-[#ccab6c]/30">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              {/* Avatar + name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                      <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                      <AvatarFallback className="text-3xl sm:text-4xl bg-[#fedea0] text-black font-semibold">
                        {user?.full_name?.charAt(0) || user?.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar
                        ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                        : <Camera className="w-5 h-5 text-white" />
                      }
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-[11px] text-muted-foreground hover:text-gold-bright transition-colors"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Change Profile Picture'}
                  </button>
                </div>

                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{user?.full_name}</h1>
                  <p className="text-sm sm:text-base text-gold/90 break-all">{user?.email}</p>
                  <Badge className={`mt-2 ${
                    user?.kyc_status === 'verified'
                      ? 'bg-green-900 text-green-400 border border-green-700'
                      : user?.kyc_status === 'pending'
                      ? 'bg-[#b38922]/25 text-gold-bright border border-[#8a6a1a]/45'
                      : 'bg-red-900 text-red-400 border border-red-700'
                  }`}>
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    KYC {user?.kyc_status?.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Edit buttons */}
              <div className="flex justify-center sm:justify-end">
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="min-w-[100px]" onClick={() => {
                      setIsEditing(false);
                      setEditableUser(JSON.parse(JSON.stringify(user)));
                    }}>
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} className="min-w-[100px] bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                      <Save className="w-4 h-4 mr-2" /> Save
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setIsEditing(true)} className="min-w-[120px]">
                    <Edit className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileSection title="Personal Information" icon={<UserCircle className="w-5 h-5 text-gold-bright flex-shrink-0" />}>
            {isEditing ? (
              <>
                <EditRow label="Full Name" name="full_name" value={editableUser.full_name} onChange={handleInputChange} icon={<UserCircle className="w-4 h-4" />} />
                <InfoRow label="Email" value={user.email} icon={<Mail className="w-4 h-4" />} />
                <EditRow label="Phone" name="phone" value={editableUser.phone} onChange={handleInputChange} icon={<Phone className="w-4 h-4" />} />
                <EditRow label="Passport No. / National ID" name="national_id" value={editableUser.national_id} onChange={handleInputChange} icon={<CreditCard className="w-4 h-4" />} />
                <EditRow label="Street" name="address.street" value={editableUser.address?.street} onChange={handleInputChange} icon={<Home className="w-4 h-4" />} />
                <EditRow label="City" name="address.city" value={editableUser.address?.city} onChange={handleInputChange} icon={<Home className="w-4 h-4 opacity-0" />} />
                <EditRow label="Country" name="address.country" value={editableUser.address?.country} onChange={handleInputChange} icon={<Home className="w-4 h-4 opacity-0" />} />
              </>
            ) : (
              <>
                <InfoRow label="Full Name" value={user.full_name} icon={<UserCircle className="w-4 h-4" />} />
                <InfoRow label="Email" value={user.email} icon={<Mail className="w-4 h-4" />} />
                <InfoRow label="Phone" value={user.phone} icon={<Phone className="w-4 h-4" />} />
                <InfoRow label="Passport No. / National ID" value={user.national_id} icon={<CreditCard className="w-4 h-4" />} />
                <InfoRow
                  label="Address"
                  value={[user.address?.street, user.address?.city, user.address?.country].filter(Boolean).join(', ')}
                  icon={<Home className="w-4 h-4" />}
                />
              </>
            )}
          </ProfileSection>

          <ProfileSection title="Bank & Wallet Details" icon={<Banknote className="w-5 h-5 text-gold-bright flex-shrink-0" />}>
            {isEditing ? (
              <>
                <EditRow label="Bank Name" name="bank_details.bank_name" value={editableUser.bank_details?.bank_name} onChange={handleInputChange} icon={<Banknote className="w-4 h-4" />} />
                <EditRow label="Account Number" name="bank_details.account_number" value={editableUser.bank_details?.account_number} onChange={handleInputChange} icon={<UserCircle className="w-4 h-4" />} />
                <EditRow label="Wallet Chain" name="bank_details.wallet_chain" value={editableUser.bank_details?.wallet_chain} onChange={handleInputChange} icon={<CreditCard className="w-4 h-4" />} />
                <EditRow label="Wallet Address" name="bank_details.wallet_address" value={editableUser.bank_details?.wallet_address} onChange={handleInputChange} icon={<Wallet className="w-4 h-4" />} />
              </>
            ) : (
              <>
                <InfoRow label="Bank Name" value={user.bank_details?.bank_name} icon={<Banknote className="w-4 h-4" />} />
                <InfoRow label="Account Number" value={user.bank_details?.account_number ? `**** **** **** ${user.bank_details.account_number.slice(-4)}` : '-'} icon={<UserCircle className="w-4 h-4" />} />
                <InfoRow label="Wallet Chain" value={user.bank_details?.wallet_chain} icon={<CreditCard className="w-4 h-4" />} />
                <InfoRow label="Wallet Address" value={user.bank_details?.wallet_address} icon={<Wallet className="w-4 h-4" />} />
              </>
            )}
          </ProfileSection>

          <ProfileSection title="Preferences" icon={<Bell className="w-5 h-5 text-gold-bright flex-shrink-0" />}>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="email_notifications" className="text-foreground text-sm">Email Notifications</Label>
              <Switch id="email_notifications" checked={true} disabled />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="sms_notifications" className="text-foreground text-sm">SMS Notifications</Label>
              <Switch id="sms_notifications" checked={preferences.sms_notifications} onCheckedChange={(val) => handlePreferenceChange('sms_notifications', val)} />
            </div>
          </ProfileSection>

          <ProfileSection title="Security" icon={<KeyRound className="w-5 h-5 text-gold-bright flex-shrink-0" />}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <Label className="text-foreground text-sm">Login Method</Label>
                <p className="text-xs text-gold/90 mt-1">Your account is secured by Google SSO. Password management is handled by Google.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="flex-shrink-0 w-full sm:w-auto">
                <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
                  Manage on Google
                </a>
              </Button>
            </div>
          </ProfileSection>
        </div>

        {/* Two-Factor Authentication */}
        <TwoFactorSetup user={user} onUpdate={loadUserData} />
      </div>
    </div>
  );
}
