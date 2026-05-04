import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Mail, Phone, Home, Banknote, Bell, ShieldCheck, KeyRound, Edit, Save, X, Shield } from "lucide-react";
import TwoFactorSetup from "@/components/security/TwoFactorSetup";

const ProfileSection = ({ title, icon, children }) => (
  <Card className="bg-gray-900 border-gray-800">
    <CardHeader className="flex flex-row items-center gap-3">
      {icon}
      <CardTitle className="text-white">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

const InfoRow = ({ label, value, icon }) => (
  <div className="flex items-start">
    <div className="w-8 text-gray-400">{icon}</div>
    <div className="flex-1">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-white font-medium">{value || '-'}</p>
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
      <div className="flex items-center">
        <div className="w-8 text-gray-400">{icon}</div>
        <div className="flex-1 space-y-1">
          <Label htmlFor={name} className="text-sm text-gray-400">{label}</Label>
          <Input id={name} name={name} value={value || ''} onChange={handleChange} className="bg-gray-800 border-gray-700 text-white"/>
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

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      setEditableUser(JSON.parse(JSON.stringify(userData))); // Deep copy for editing
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
        // Ensure nested objects exist before trying to update them
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // We only want to update the fields that are editable
      const { full_name, phone, address, bank_details } = editableUser;
      await User.updateMyUserData({ full_name, phone, address, bank_details });
      setIsEditing(false);
    } catch(error) {
      console.error("Error saving user data:", error);
    } finally {
      loadUserData(); // Reload all data to ensure consistency
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="text-4xl bg-yellow-400 text-black font-semibold">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-white">{user?.full_name}</h1>
              <p className="text-lg text-gray-400">{user?.email}</p>
              <Badge className="mt-2" variant={user?.kyc_status === 'verified' ? 'default' : 'destructive'}>
                <ShieldCheck className="w-3 h-3 mr-1"/>
                KYC {user?.kyc_status?.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div>
            {isEditing ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditableUser(JSON.parse(JSON.stringify(user))); // Reset editableUser to original
                }}><X className="w-4 h-4 mr-2"/>Cancel</Button>
                <Button onClick={handleSave} className="bg-yellow-400 text-black hover:bg-yellow-500"><Save className="w-4 h-4 mr-2"/>Save</Button>
              </div>
            ) : (
              <Button onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2"/>Edit Profile</Button>
            )}
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ProfileSection title="Personal Information" icon={<UserCircle className="w-5 h-5 text-yellow-400"/>}>
            {isEditing ? (
              <>
                <EditRow label="Full Name" name="full_name" value={editableUser.full_name} onChange={handleInputChange} icon={<UserCircle className="w-4 h-4"/>}/>
                <InfoRow label="Email" value={user.email} icon={<Mail className="w-4 h-4"/>}/>
                <EditRow label="Phone" name="phone" value={editableUser.phone} onChange={handleInputChange} icon={<Phone className="w-4 h-4"/>}/>
                <EditRow label="Street" name="address.street" value={editableUser.address?.street} onChange={handleInputChange} icon={<Home className="w-4 h-4"/>}/>
                <EditRow label="City" name="address.city" value={editableUser.address?.city} onChange={handleInputChange} icon={<Home className="w-4 h-4 opacity-0"/>}/>
                <EditRow label="Country" name="address.country" value={editableUser.address?.country} onChange={handleInputChange} icon={<Home className="w-4 h-4 opacity-0"/>}/>
              </>
            ) : (
              <>
                <InfoRow label="Full Name" value={user.full_name} icon={<UserCircle className="w-4 h-4"/>}/>
                <InfoRow label="Email" value={user.email} icon={<Mail className="w-4 h-4"/>}/>
                <InfoRow label="Phone" value={user.phone} icon={<Phone className="w-4 h-4"/>}/>
                <InfoRow label="Address" 
                  value={`${user.address?.street || ''}${user.address?.street ? ', ' : ''}${user.address?.city || ''}${user.address?.city ? ', ' : ''}${user.address?.country || ''}`}
                  icon={<Home className="w-4 h-4"/>}
                />
              </>
            )}
          </ProfileSection>

          <ProfileSection title="Bank Details" icon={<Banknote className="w-5 h-5 text-yellow-400"/>}>
            {isEditing ? (
              <>
                <EditRow label="Bank Name" name="bank_details.bank_name" value={editableUser.bank_details?.bank_name} onChange={handleInputChange} icon={<Banknote className="w-4 h-4"/>}/>
                <EditRow label="Account Number" name="bank_details.account_number" value={editableUser.bank_details?.account_number} onChange={handleInputChange} icon={<UserCircle className="w-4 h-4"/>}/>
              </>
            ) : (
              <>
                <InfoRow label="Bank Name" value={user.bank_details?.bank_name} icon={<Banknote className="w-4 h-4"/>}/>
                <InfoRow label="Account Number" value={user.bank_details?.account_number ? `**** **** **** ${user.bank_details.account_number.slice(-4)}` : '-'} icon={<UserCircle className="w-4 h-4"/>}/>
              </>
            )}
          </ProfileSection>

          <ProfileSection title="Preferences" icon={<Bell className="w-5 h-5 text-yellow-400"/>}>
            <div className="flex items-center justify-between">
              <Label htmlFor="email_notifications" className="text-white">Email Notifications</Label>
              <Switch id="email_notifications" checked={preferences.email_notifications} onCheckedChange={(val) => handlePreferenceChange('email_notifications', val)}/>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms_notifications" className="text-white">SMS Notifications</Label>
              <Switch id="sms_notifications" checked={preferences.sms_notifications} onCheckedChange={(val) => handlePreferenceChange('sms_notifications', val)}/>
            </div>
          </ProfileSection>

          <ProfileSection title="Security" icon={<KeyRound className="w-5 h-5 text-yellow-400"/>}>
            <div className="flex items-center justify-between">
              <div>
                 <Label className="text-white">Login Method</Label>
                 <p className="text-sm text-gray-400">Your account is secured by Google SSO. All password management is handled directly by Google for the highest level of security.</p>
              </div>
              <Button asChild variant="outline">
                <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
                  Manage on Google
                </a>
              </Button>
            </div>
          </ProfileSection>
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="mt-6">
          <TwoFactorSetup user={user} onUpdate={loadUserData} />
        </div>
      </div>
    </div>
  );
}