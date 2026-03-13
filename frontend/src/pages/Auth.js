import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [loginMethod, setLoginMethod] = useState("email"); // email or phone

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    name: "",
    role: "buyer",
  });

  // Phone OTP states
  const [phoneData, setPhoneData] = useState({ phone: "", name: "", role: "buyer" });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // Email OTP states
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const role = searchParams.get("role");
    if (tab === "register") {
      setActiveTab("register");
      if (role === "seller") {
        setRegisterData(prev => ({ ...prev, role: "seller" }));
        setPhoneData(prev => ({ ...prev, role: "seller" }));
      }
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // First, verify credentials and send OTP
      const response = await axios.post(`${API}/auth/email/send-otp`, {
        email: loginData.email,
        password: loginData.password,
      });

      setEmailOtpSent(true);
      if (response.data.demo) {
        toast.success("رمز OTP (وضع تجريبي): تحقق من console");
      } else {
        toast.success("تم إرسال رمز التحقق إلى بريدك الإلكتروني");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تسجيل الدخول. تحقق من بياناتك");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async (e) => {
    e.preventDefault();
    if (!emailOtp || emailOtp.length !== 6) {
      toast.error("يرجى إدخال رمز التحقق المكون من 6 أرقام");
      return;
    }

    setEmailOtpLoading(true);
    try {
      const response = await axios.post(`${API}/auth/email/verify-otp`, {
        email: loginData.email,
        otp: emailOtp,
      });

      // Save token and user
      localStorage.setItem("token", response.data.token);
      const userName = response.data.user.name;
      toast.success(`أهلاً وسهلاً ${userName}! 👋`);

      // Reload to update auth context
      window.location.href = "/";
    } catch (error) {
      toast.error(error.response?.data?.detail || "رمز التحقق غير صحيح");
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phoneData.phone || phoneData.phone.length < 10) {
      toast.error("يرجى إدخال رقم جوال صحيح");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/auth/phone/send-otp`, {
        phone: phoneData.phone,
      });
      
      setOtpSent(true);
      if (response.data.demo) {
        toast.success("رمز OTP (وضع تجريبي): تحقق من console");
      } else {
        toast.success("تم إرسال رمز التحقق إلى جوالك");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إرسال رمز التحقق");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("يرجى إدخال رمز التحقق المكون من 6 أرقام");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/phone/verify`, {
        phone: phoneData.phone,
        otp: otp,
        name: phoneData.name || undefined,
        role: phoneData.role,
      });

      // Save token and user
      localStorage.setItem("token", response.data.token);
      const userName = response.data.user.name;
      toast.success(`أهلاً وسهلاً ${userName}! 👋`);

      // Reload to update auth context
      window.location.href = "/";
    } catch (error) {
      toast.error(error.response?.data?.detail || "رمز التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(
        registerData.email,
        registerData.password,
        registerData.name,
        registerData.role
      );
      toast.success(`مرحباً ${user.name}! تم إنشاء حسابك بنجاح 🎉`);
      navigate("/");
    } catch (error) {
      toast.error("فشل إنشاء الحساب. حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-md mx-auto">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-heading">
                مرحبًا بك في نسبه
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="login-tab">
                    تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger value="register" data-testid="register-tab">
                    حساب جديد
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  {/* Login Method Toggle */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      type="button"
                      variant={loginMethod === "email" ? "default" : "outline"}
                      onClick={() => setLoginMethod("email")}
                      className="flex-1"
                      data-testid="email-login-toggle"
                    >
                      بريد إلكتروني
                    </Button>
                    <Button
                      type="button"
                      variant={loginMethod === "phone" ? "default" : "outline"}
                      onClick={() => setLoginMethod("phone")}
                      className="flex-1"
                      data-testid="phone-login-toggle"
                    >
                      رقم الجوال
                    </Button>
                  </div>

                  {loginMethod === "email" ? (
                    <div className="space-y-4">
                      {!emailOtpSent ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                          <div>
                            <Label htmlFor="login-email">البريد الإلكتروني</Label>
                            <Input
                              id="login-email"
                              type="email"
                              value={loginData.email}
                              onChange={(e) =>
                                setLoginData({ ...loginData, email: e.target.value })
                              }
                              required
                              data-testid="login-email-input"
                              className="h-12"
                            />
                          </div>
                          <div>
                            <Label htmlFor="login-password">كلمة المرور</Label>
                            <Input
                              id="login-password"
                              type="password"
                              value={loginData.password}
                              onChange={(e) =>
                                setLoginData({ ...loginData, password: e.target.value })
                              }
                              required
                              data-testid="login-password-input"
                              className="h-12"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full bg-slate-900 hover:bg-slate-800 rounded-full py-6"
                            disabled={loading}
                            data-testid="login-submit-button"
                          >
                            {loading ? "جاري التسجيل..." : "تسجيل الدخول"}
                          </Button>

                          <div className="text-center">
                            <Link
                              to="/forgot-password"
                              className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                              data-testid="forgot-password-link"
                            >
                              نسيت كلمة المرور؟
                            </Link>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                          <div className="text-center mb-4">
                            <p className="text-sm text-slate-600">
                              تم إرسال رمز التحقق إلى:
                            </p>
                            <p className="font-semibold text-slate-900">{loginData.email}</p>
                          </div>

                          <div>
                            <Label htmlFor="email-otp-code">رمز التحقق (OTP)</Label>
                            <Input
                              id="email-otp-code"
                              type="text"
                              placeholder="000000"
                              maxLength={6}
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                              required
                              data-testid="email-otp-input"
                              className="h-12 text-center text-2xl tracking-widest"
                              dir="ltr"
                            />
                            <p className="text-xs text-slate-500 mt-1 text-center">
                              أدخل الرمز المكون من 6 أرقام
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEmailOtpSent(false);
                                setEmailOtp("");
                              }}
                              className="flex-1"
                            >
                              تغيير البريد
                            </Button>
                            <Button
                              type="submit"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-full"
                              disabled={emailOtpLoading}
                              data-testid="verify-email-otp-button"
                            >
                              {emailOtpLoading ? "جاري التحقق..." : "تحقق ودخول"}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!otpSent ? (
                        <form onSubmit={handleSendOTP} className="space-y-4">
                          <div>
                            <Label htmlFor="phone-number">رقم الجوال</Label>
                            <Input
                              id="phone-number"
                              type="tel"
                              placeholder="+966xxxxxxxxx"
                              value={phoneData.phone}
                              onChange={(e) =>
                                setPhoneData({ ...phoneData, phone: e.target.value })
                              }
                              required
                              data-testid="phone-input"
                              className="h-12"
                              dir="ltr"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              أدخل رقم الجوال مع رمز الدولة (مثال: +966512345678)
                            </p>
                          </div>
                          <Button
                            type="submit"
                            className="w-full bg-orange-600 hover:bg-orange-700 rounded-full py-6"
                            disabled={otpLoading}
                            data-testid="send-otp-button"
                          >
                            {otpLoading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                          </Button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                          <div>
                            <Label htmlFor="otp-code">رمز التحقق (OTP)</Label>
                            <Input
                              id="otp-code"
                              type="text"
                              placeholder="000000"
                              maxLength={6}
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                              required
                              data-testid="otp-input"
                              className="h-12 text-center text-2xl tracking-widest"
                              dir="ltr"
                            />
                            <p className="text-xs text-slate-500 mt-1 text-center">
                              أدخل الرمز المكون من 6 أرقام المرسل إلى {phoneData.phone}
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="phone-name">الاسم (اختياري)</Label>
                            <Input
                              id="phone-name"
                              type="text"
                              placeholder="اسمك الكامل"
                              value={phoneData.name}
                              onChange={(e) =>
                                setPhoneData({ ...phoneData, name: e.target.value })
                              }
                              data-testid="phone-name-input"
                              className="h-12"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setOtpSent(false);
                                setOtp("");
                              }}
                              className="flex-1"
                            >
                              تغيير الرقم
                            </Button>
                            <Button
                              type="submit"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-full"
                              disabled={loading}
                              data-testid="verify-otp-button"
                            >
                              {loading ? "جاري التحقق..." : "تحقق ودخول"}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="register-name">الاسم</Label>
                      <Input
                        id="register-name"
                        type="text"
                        value={registerData.name}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, name: e.target.value })
                        }
                        required
                        data-testid="register-name-input"
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-email">البريد الإلكتروني</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, email: e.target.value })
                        }
                        required
                        data-testid="register-email-input"
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-password">كلمة المرور</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            password: e.target.value,
                          })
                        }
                        required
                        data-testid="register-password-input"
                        className="h-12"
                      />
                    </div>

                    <div>
                      <Label>نوع الحساب</Label>
                      <RadioGroup
                        value={registerData.role}
                        onValueChange={(value) =>
                          setRegisterData({ ...registerData, role: value })
                        }
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem
                            value="buyer"
                            id="buyer"
                            data-testid="buyer-radio"
                          />
                          <Label htmlFor="buyer" className="cursor-pointer">
                            مشتري
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem
                            value="seller"
                            id="seller"
                            data-testid="seller-radio"
                          />
                          <Label htmlFor="seller" className="cursor-pointer">
                            بائع
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-orange-600 hover:bg-orange-700 rounded-full py-6"
                      disabled={loading}
                      data-testid="register-submit-button"
                    >
                      {loading ? "جاري التسجيل..." : "إنشاء حساب"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
