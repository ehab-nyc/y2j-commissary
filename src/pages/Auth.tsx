import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { passwordSchema } from '@/lib/validation';
import { validateAndNormalizePhone } from '@/lib/phoneValidation';

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [settings, setSettings] = useState({ company_name: 'Commissary System', logo_url: '', login_background_url: '', login_blur_amount: '2' });
  const [isHalloween, setIsHalloween] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);

  useEffect(() => {
    fetchSettings();
    // Check if Halloween theme is active (not halloween-minimal)
    const checkHalloween = () => {
      const classList = document.documentElement.classList;
      setIsHalloween(classList.contains('halloween') && !classList.contains('halloween-minimal'));
    };
    checkHalloween();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkHalloween);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['company_name', 'logo_url', 'login_background_url', 'login_blur_amount']);
    
    if (data) {
      const settingsObj = data.reduce((acc: any, item) => {
        acc[item.key] = item.value || '';
        return acc;
      }, {});
      setSettings({
        company_name: settingsObj.company_name || 'Commissary System',
        logo_url: settingsObj.logo_url || '',
        login_background_url: settingsObj.login_background_url || '',
        login_blur_amount: settingsObj.login_blur_amount || '2'
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('signup-email') as string;
    const password = formData.get('signup-password') as string;
    const fullName = formData.get('signup-name') as string;
    const cartName = formData.get('signup-cart-name') as string;
    const cartNumber = formData.get('signup-cart-number') as string;
    const phone = formData.get('signup-phone') as string;

    // Validate SMS consent
    if (!smsConsent) {
      toast.error('You must consent to receive messages to create an account');
      setLoading(false);
      return;
    }

    // Validate and normalize phone format
    const phoneResult = validateAndNormalizePhone(phone);
    if (!phoneResult.success) {
      toast.error(phoneResult.error);
      setLoading(false);
      return;
    }
    
    const normalizedPhone = phoneResult.phone!;

    // Validate cart information
    const cartNameSchema = z.string()
      .trim()
      .min(1, 'Cart name is required')
      .max(100, 'Cart name too long')
      .regex(/^[a-zA-Z0-9\s-]+$/, 'Cart name can only contain letters, numbers, spaces, and hyphens');
    
    const cartNumberSchema = z.string()
      .trim()
      .min(1, 'Cart number is required')
      .max(20, 'Cart number too long')
      .regex(/^[a-zA-Z0-9-]+$/, 'Cart number can only contain letters, numbers, and hyphens');

    const cartNameValidation = cartNameSchema.safeParse(cartName);
    if (!cartNameValidation.success) {
      toast.error(cartNameValidation.error.errors[0].message);
      setLoading(false);
      return;
    }

    const cartNumberValidation = cartNumberSchema.safeParse(cartNumber);
    if (!cartNumberValidation.success) {
      toast.error(cartNumberValidation.error.errors[0].message);
      setLoading(false);
      return;
    }

    // Validate password strength
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      toast.error(passwordValidation.error.errors[0].message);
      setLoading(false);
      return;
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Update profile with cart info and add phone number
      if (authData.user) {
        await supabase
          .from('profiles')
          .update({ 
            cart_name: cartName.trim(),
            cart_number: cartNumber.trim(),
            phone: normalizedPhone
          })
          .eq('id', authData.user.id);
        
        // Add phone number to customer_phones table with SMS consent
        await supabase
          .from('customer_phones')
          .insert({
            customer_id: authData.user.id,
            phone: normalizedPhone,
            is_primary: true,
            sms_consent: smsConsent,
            sms_consent_date: new Date().toISOString()
          });
      }
      toast.success('Account created successfully!');
      navigate('/');
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('signin-email') as string;
    const password = formData.get('signin-password') as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed in successfully!');
      navigate('/');
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset link sent to your email!');
      setShowForgotPassword(false);
      setResetEmail('');
    }

    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: settings.login_background_url 
          ? `url(${settings.login_background_url})` 
          : 'linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--secondary) / 0.2), hsl(var(--background)))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        imageRendering: '-webkit-optimize-contrast',
        WebkitFontSmoothing: 'antialiased',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
      }}
    >
      <div 
        className="absolute inset-0 bg-background/20" 
        style={{ backdropFilter: `blur(${Math.max(0, Number(settings.login_blur_amount) - 1)}px)` }}
      />
      <Card className="w-full max-w-md shadow-elevated relative z-10">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center items-center gap-4 mb-2 relative">
            {/* Halloween pumpkin decoration - left side */}
            {isHalloween && (
              <div className="text-7xl animate-pulse pointer-events-none filter drop-shadow-[0_0_25px_rgba(255,94,0,0.9)]">
                🎃
              </div>
            )}
            
            <div className="flex flex-col items-center gap-2">
              {settings.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt="Logo" 
                  className="h-16 w-16 rounded-full object-cover"
                  width="64"
                  height="64"
                  fetchPriority="high"
                />
              ) : (
                <div className="p-3 rounded-full bg-primary/10">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                </div>
              )}
              <CardTitle className="text-2xl font-bold">Y2J Commissary</CardTitle>
            </div>
          </div>
          <CardDescription>{t('auth.signInToAccess')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('auth.email')}</Label>
                  <Input
                    id="signin-email"
                    name="signin-email"
                    type="email"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      name="signin-password"
                      type={showSignInPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                    >
                      {showSignInPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="link" className="p-0 h-auto text-sm">
                        {t('auth.forgotPassword')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('auth.resetPassword')}</DialogTitle>
                        <DialogDescription>
                          {t('auth.resetPasswordDesc')}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">{t('auth.email')}</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="your.email@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? t('auth.sending') : t('auth.sendResetLink')}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.signingIn') : t('auth.signIn')}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                  <Input
                    id="signup-name"
                    name="signup-name"
                    type="text"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-cart-name">{t('auth.cartName')}</Label>
                  <Input
                    id="signup-cart-name"
                    name="signup-cart-name"
                    type="text"
                    placeholder="Cart Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-cart-number">{t('auth.cartNumber')}</Label>
                  <Input
                    id="signup-cart-number"
                    name="signup-cart-number"
                    type="text"
                    placeholder="Cart Number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number *</Label>
                  <Input
                    id="signup-phone"
                    name="signup-phone"
                    type="tel"
                    placeholder="+1234567890"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for SMS order notifications
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <Input
                    id="signup-email"
                    name="signup-email"
                    type="email"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      name="signup-password"
                      type={showSignUpPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('auth.passwordRequirement')}
                  </p>
                </div>
                
                <div className="flex items-start space-x-3 py-2">
                  <Checkbox
                    id="sms-consent"
                    checked={smsConsent}
                    onCheckedChange={(checked) => setSmsConsent(checked as boolean)}
                    className="mt-1"
                  />
                  <Label 
                    htmlFor="sms-consent" 
                    className="text-sm font-normal leading-relaxed cursor-pointer"
                  >
                    By checking this box, you agree to receive automated text messages from Y2J NYC Corp / Y2J Commissary about your orders, account status, and related updates. Message and data rates may apply. Reply STOP to unsubscribe or HELP for assistance.{" "}
                    <Link 
                      to="/privacy-policy" 
                      className="text-primary hover:underline"
                      target="_blank"
                    >
                      View our Privacy Policy
                    </Link>
                  </Label>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
