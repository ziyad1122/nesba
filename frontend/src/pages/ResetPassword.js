import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!token || !email) {
      toast.error("رابط غير صالح");
      navigate("/auth");
    }
  }, [token, email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("كلمات المرور غير متطابقة");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/reset-password`, {
        email,
        token,
        new_password: password,
      });

      setSuccess(true);
      toast.success("تم تغيير كلمة المرور بنجاح!");
      
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.detail || "الرابط غير صالح أو منتهي الصلاحية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-md mx-auto">
          {!success ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-2xl font-heading flex items-center justify-center gap-2">
                  <Lock className="w-6 h-6 text-emerald-600" />
                  إعادة تعيين كلمة المرور
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-900">
                    <strong>البريد الإلكتروني:</strong>{" "}
                    <span className="font-mono">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="password">كلمة المرور الجديدة</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12"
                      placeholder="6 أحرف على الأقل"
                      data-testid="new-password-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12"
                      placeholder="أعد إدخال كلمة المرور"
                      data-testid="confirm-password-input"
                    />
                  </div>

                  {password && confirmPassword && password !== confirmPassword && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>كلمات المرور غير متطابقة</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-6"
                    disabled={loading || password !== confirmPassword}
                    data-testid="reset-password-button"
                  >
                    {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-emerald-200">
              <CardContent className="p-10 text-center">
                <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold mb-2">
                  تم التحديث بنجاح! ✅
                </h2>
                <p className="text-slate-600 mb-6">
                  تم تغيير كلمة المرور بنجاح. جاري تحويلك لصفحة تسجيل الدخول...
                </p>
                <div className="animate-pulse">
                  <div className="spinner mx-auto"></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
