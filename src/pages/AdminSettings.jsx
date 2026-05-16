import React, { useState, useEffect } from "react";
import { SystemSettings } from "@/entities/SystemSettings";
import { AuditLog } from "@/entities/AuditLog";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Palette, 
  Bell, 
  Shield, 
  FileText, 
  Clock,
  Upload,
  Download,
  Save,
  Eye,
  History,
  UserPlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { sendInvitationEmail } from "@/functions/sendInvitationEmail";
import { format } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";

const SettingSection = ({ title, icon, children }) => (
  <Card className="bg-card border border-[#ccab6c]/30">
    <CardHeader className="flex flex-row items-center gap-3">
      {icon}
      <CardTitle className="text-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isInviteAdminOpen, setIsInviteAdminOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role: 'admin' });
  const [inviting, setInviting] = useState(false);

  // Default settings structure
  const defaultSettings = {
    // Branding
    company_name: "Varma Capital",
    logo_light_url: "",
    logo_dark_url: "",
    favicon_url: "",
    primary_color: "#FFD700",
    domain: "investor.varmacapital.io",
    
    // Notifications
    email_notifications: true,
    sms_notifications: false,
    email_provider: "ses",
    smtp_host: "",
    smtp_port: "587",
    smtp_username: "",
    smtp_password: "",
    
    // Security
    session_timeout: "24",
    require_2fa: false,
    password_policy: "standard",
    max_login_attempts: "5",
    
    // SLA
    response_time_hours: "24",
    resolution_time_hours: "72",
    escalation_enabled: true,
    urgent_response_hours: "4",
    
    // Compliance
    jurisdiction: "United States",
    risk_disclosure: "Investment in financial instruments carries risk of loss. Past performance does not guarantee future results.",
    privacy_policy_url: "",
    terms_of_service_url: "",
    
    // NAV Settings
    official_nav_frequency: "monthly",
    indicative_nav_enabled: true,
    auto_calculate_pnl: true,
    nav_cutoff_time: "16:00"
  };

  useEffect(() => {
    loadSettings();
    loadAuditLogs();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settingsData = await SystemSettings.list();
      const settingsMap = {};
      
      // Load existing settings
      settingsData.forEach(setting => {
        try {
          settingsMap[setting.setting_key] = JSON.parse(setting.setting_value);
        } catch {
          settingsMap[setting.setting_key] = setting.setting_value;
        }
      });
      
      // Merge with defaults
      setSettings({ ...defaultSettings, ...settingsMap });
    } catch (error) {
      console.error("Error loading settings:", error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await AuditLog.list('-created_date', 50);
      setAuditLogs(logs);
    } catch (error) {
      console.error("Error loading audit logs:", error);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSetting = async (key, value, category = 'general') => {
    setSaving(true);
    try {
      // Try to find existing setting
      const existingSettings = await SystemSettings.filter({ setting_key: key });
      const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      if (existingSettings.length > 0) {
        await SystemSettings.update(existingSettings[0].id, {
          setting_value: settingValue,
          category
        });
      } else {
        await SystemSettings.create({
          setting_key: key,
          setting_value: settingValue,
          category,
          description: `Setting for ${key.replace('_', ' ')}`
        });
      }
      
      // Log the change
      const user = await User.me();
      await AuditLog.create({
        user_email: user.email,
        action: 'update',
        entity_type: 'SystemSettings',
        entity_id: key,
        changes: { [key]: { new: value } }
      });
      
    } catch (error) {
      console.error("Error saving setting:", error);
      alert("Error saving setting. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveAllSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'company_name', value: settings.company_name, category: 'branding' },
        { key: 'logo_light_url', value: settings.logo_light_url, category: 'branding' },
        { key: 'logo_dark_url', value: settings.logo_dark_url, category: 'branding' },
        { key: 'primary_color', value: settings.primary_color, category: 'branding' },
        { key: 'domain', value: settings.domain, category: 'branding' },
        { key: 'email_notifications', value: settings.email_notifications, category: 'notifications' },
        { key: 'sms_notifications', value: settings.sms_notifications, category: 'notifications' },
        { key: 'email_provider', value: settings.email_provider, category: 'notifications' },
        { key: 'session_timeout', value: settings.session_timeout, category: 'security' },
        { key: 'require_2fa', value: settings.require_2fa, category: 'security' },
        { key: 'response_time_hours', value: settings.response_time_hours, category: 'sla' },
        { key: 'resolution_time_hours', value: settings.resolution_time_hours, category: 'sla' },
        { key: 'jurisdiction', value: settings.jurisdiction, category: 'compliance' },
        { key: 'risk_disclosure', value: settings.risk_disclosure, category: 'compliance' },
        { key: 'official_nav_frequency', value: settings.official_nav_frequency, category: 'general' },
        { key: 'indicative_nav_enabled', value: settings.indicative_nav_enabled, category: 'general' },
      ];

      for (const setting of settingsToSave) {
        await saveSetting(setting.key, setting.value, setting.category);
      }
      
      alert("All settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving some settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file, type) => {
    setUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file });
      updateSetting(`logo_${type}_url`, file_url);
      await saveSetting(`logo_${type}_url`, file_url, 'branding');
      alert(`${type} logo uploaded successfully!`);
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Error uploading logo. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleInviteAdmin = async () => {
    if (!inviteForm.full_name || !inviteForm.email) {
      alert('Please fill in all fields');
      return;
    }
    
    setInviting(true);
    try {
      const response = await sendInvitationEmail({ 
        email: inviteForm.email, 
        fullName: inviteForm.full_name,
        role: inviteForm.role
      });
      
      if (response.error) {
        throw new Error(response.error.message || 'Failed to send invitation');
      }
      
      alert(`Invitation sent to ${inviteForm.email} as ${inviteForm.role}`);
      setIsInviteAdminOpen(false);
      setInviteForm({ full_name: '', email: '', role: 'admin' });
    } catch (error) {
      console.error("Error inviting admin:", error);
      alert(`Failed to send invitation: ${error.message}`);
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading system settings..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
            <p className="text-gold/90">Configure system-wide settings and preferences</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isInviteAdminOpen} onOpenChange={setIsInviteAdminOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-[#b38922] text-gold-bright hover:bg-[#fedea0] hover:text-black">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border border-[#ccab6c]/30">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Invite Admin User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-foreground/80">Full Name</Label>
                    <Input 
                      value={inviteForm.full_name}
                      onChange={(e) => setInviteForm({...inviteForm, full_name: e.target.value})}
                      placeholder="John Doe"
                      className="bg-muted border-[#ccab6c]/20"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground/80">Email</Label>
                    <Input 
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                      placeholder="admin@company.com"
                      className="bg-muted border-[#ccab6c]/20"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground/80">Role</Label>
                    <Select value={inviteForm.role} onValueChange={(val) => setInviteForm({...inviteForm, role: val})}>
                      <SelectTrigger className="bg-muted border-[#ccab6c]/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted text-foreground">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteAdminOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleInviteAdmin}
                    disabled={inviting}
                    className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
                  >
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={saveAllSettings} 
              disabled={saving}
              className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="bg-muted border-[#ccab6c]/20">
            <TabsTrigger value="branding" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              <Palette className="w-4 h-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="sla" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              <Clock className="w-4 h-4 mr-2" />
              SLA
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              <FileText className="w-4 h-4 mr-2" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              <History className="w-4 h-4 mr-2" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6">
            <SettingSection title="Brand Identity" icon={<Palette className="w-5 h-5 text-gold-bright" />}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground/80">Company Name</Label>
                  <Input 
                    value={settings.company_name} 
                    onChange={(e) => updateSetting('company_name', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                  />
                </div>
                <div>
                  <Label className="text-foreground/80">Domain</Label>
                  <Input 
                    value={settings.domain} 
                    onChange={(e) => updateSetting('domain', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-foreground/80">Primary Color (Gold)</Label>
                <div className="flex gap-3 items-center mt-2">
                  <Input 
                    type="color"
                    value={settings.primary_color} 
                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                    className="w-20 h-10 bg-muted border-[#ccab6c]/20"
                  />
                  <Input 
                    value={settings.primary_color} 
                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                    placeholder="#FFD700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground/80">Light Mode Logo</Label>
                  <div className="mt-2 space-y-2">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleLogoUpload(e.target.files[0], 'light')}
                      className="bg-muted border-[#ccab6c]/20"
                      disabled={uploadingLogo}
                    />
                    {settings.logo_light_url && (
                      <img src={settings.logo_light_url} alt="Light logo" className="h-12 bg-white p-2 rounded" />
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-foreground/80">Dark Mode Logo</Label>
                  <div className="mt-2 space-y-2">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleLogoUpload(e.target.files[0], 'dark')}
                      className="bg-muted border-[#ccab6c]/20"
                      disabled={uploadingLogo}
                    />
                    {settings.logo_dark_url && (
                      <img src={settings.logo_dark_url} alt="Dark logo" className="h-12 bg-muted p-2 rounded" />
                    )}
                  </div>
                </div>
              </div>
            </SettingSection>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <SettingSection title="Notification Settings" icon={<Bell className="w-5 h-5 text-gold-bright" />}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground/80">Email Notifications</Label>
                  <Switch 
                    checked={settings.email_notifications} 
                    onCheckedChange={(val) => updateSetting('email_notifications', val)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-foreground/80">SMS Notifications</Label>
                  <Switch 
                    checked={settings.sms_notifications} 
                    onCheckedChange={(val) => updateSetting('sms_notifications', val)}
                  />
                </div>
                
                <div>
                  <Label className="text-foreground/80">Email Provider</Label>
                  <Select value={settings.email_provider} onValueChange={(val) => updateSetting('email_provider', val)}>
                    <SelectTrigger className="bg-muted border-[#ccab6c]/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted text-foreground">
                      <SelectItem value="ses">Amazon SES</SelectItem>
                      <SelectItem value="smtp">Custom SMTP</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingSection>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SettingSection title="Security Settings" icon={<Shield className="w-5 h-5 text-gold-bright" />}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground/80">Session Timeout (hours)</Label>
                  <Input 
                    type="number"
                    value={settings.session_timeout} 
                    onChange={(e) => updateSetting('session_timeout', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                  />
                </div>
                <div>
                  <Label className="text-foreground/80">Max Login Attempts</Label>
                  <Input 
                    type="number"
                    value={settings.max_login_attempts} 
                    onChange={(e) => updateSetting('max_login_attempts', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80">Require Two-Factor Authentication</Label>
                <Switch 
                  checked={settings.require_2fa} 
                  onCheckedChange={(val) => updateSetting('require_2fa', val)}
                />
              </div>
              
              <div>
                <Label className="text-foreground/80">Password Policy</Label>
                <Select value={settings.password_policy} onValueChange={(val) => updateSetting('password_policy', val)}>
                  <SelectTrigger className="bg-muted border-[#ccab6c]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted text-foreground">
                    <SelectItem value="standard">Standard (8+ chars)</SelectItem>
                    <SelectItem value="strong">Strong (12+ chars, mixed case, numbers, symbols)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (16+ chars, complex requirements)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SettingSection>
          </TabsContent>

          <TabsContent value="sla" className="space-y-6">
            <SettingSection title="Service Level Agreements" icon={<Clock className="w-5 h-5 text-gold-bright" />}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground/80">Standard Response Time (hours)</Label>
                  <Input 
                    type="number"
                    value={settings.response_time_hours} 
                    onChange={(e) => updateSetting('response_time_hours', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                  />
                </div>
                <div>
                  <Label className="text-foreground/80">Standard Resolution Time (hours)</Label>
                  <Input 
                    type="number"
                    value={settings.resolution_time_hours} 
                    onChange={(e) => updateSetting('resolution_time_hours', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-foreground/80">Urgent Priority Response Time (hours)</Label>
                <Input 
                  type="number"
                  value={settings.urgent_response_hours} 
                  onChange={(e) => updateSetting('urgent_response_hours', e.target.value)}
                  className="bg-muted border-[#ccab6c]/20"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80">Enable Automatic Escalation</Label>
                <Switch 
                  checked={settings.escalation_enabled} 
                  onCheckedChange={(val) => updateSetting('escalation_enabled', val)}
                />
              </div>
            </SettingSection>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <SettingSection title="Legal & Compliance" icon={<FileText className="w-5 h-5 text-gold-bright" />}>
              <div>
                <Label className="text-foreground/80">Jurisdiction</Label>
                <Input 
                  value={settings.jurisdiction} 
                  onChange={(e) => updateSetting('jurisdiction', e.target.value)}
                  className="bg-muted border-[#ccab6c]/20"
                />
              </div>
              
              <div>
                <Label className="text-foreground/80">Risk Disclosure Statement</Label>
                <Textarea 
                  value={settings.risk_disclosure} 
                  onChange={(e) => updateSetting('risk_disclosure', e.target.value)}
                  className="bg-muted border-[#ccab6c]/20 h-32"
                  placeholder="Enter your standard risk disclosure..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground/80">Privacy Policy URL</Label>
                  <Input 
                    value={settings.privacy_policy_url} 
                    onChange={(e) => updateSetting('privacy_policy_url', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label className="text-foreground/80">Terms of Service URL</Label>
                  <Input 
                    value={settings.terms_of_service_url} 
                    onChange={(e) => updateSetting('terms_of_service_url', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </SettingSection>

            <SettingSection title="NAV & Valuation Settings" icon={<Settings className="w-5 h-5 text-gold-bright" />}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground/80">Official NAV Frequency</Label>
                  <Select value={settings.official_nav_frequency} onValueChange={(val) => updateSetting('official_nav_frequency', val)}>
                    <SelectTrigger className="bg-muted border-[#ccab6c]/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted text-foreground">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly (Recommended)</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground/80">NAV Cutoff Time</Label>
                  <Input 
                    type="time"
                    value={settings.nav_cutoff_time} 
                    onChange={(e) => updateSetting('nav_cutoff_time', e.target.value)}
                    className="bg-muted border-[#ccab6c]/20"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground/80">Enable Indicative Daily NAV</Label>
                  <Switch 
                    checked={settings.indicative_nav_enabled} 
                    onCheckedChange={(val) => updateSetting('indicative_nav_enabled', val)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-foreground/80">Auto-Calculate P&L</Label>
                  <Switch 
                    checked={settings.auto_calculate_pnl} 
                    onCheckedChange={(val) => updateSetting('auto_calculate_pnl', val)}
                  />
                </div>
              </div>
            </SettingSection>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card className="bg-card border border-[#ccab6c]/30">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-3">
                  <History className="w-5 h-5 text-gold-bright" />
                  Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#ccab6c]/25">
                        <TableHead className="text-gold/90">Timestamp</TableHead>
                        <TableHead className="text-gold/90">User</TableHead>
                        <TableHead className="text-gold/90">Action</TableHead>
                        <TableHead className="text-gold/90">Entity</TableHead>
                        <TableHead className="text-gold/90">Changes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id} className="border-[#ccab6c]/25">
                          <TableCell className="text-foreground/80">
                            {format(new Date(log.created_date), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-foreground/80">{log.user_email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground/80">{log.entity_type}</TableCell>
                          <TableCell className="text-foreground/80">
                            {log.changes ? (
                              <Button variant="ghost" size="sm" className="text-gold-bright">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}