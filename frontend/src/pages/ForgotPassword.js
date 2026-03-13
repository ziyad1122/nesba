import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/forgot-password?email=${email}`);
      
      setSent(true);
      if (response.data.demo) {
        toast.info("وضع تجريبي: تحقق من console لرؤية الرابط");
      } else {
        toast.success("تم إرسال رابط إعادة التعيين إلى بريدك");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-md mx-auto">
          {!sent ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-2xl font-heading flex items-center justify-center gap-2">
                  <Mail className="w-6 h-6 text-orange-600" />
                  نسيت كلمة المرور؟
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-center mb-6">
                  لا تقلق! أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                      placeholder="example@email.com"
                      dir="ltr"
                      data-testid="forgot-password-email"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-full py-6"
                    disabled={loading}
                    data-testid="send-reset-link-button"
                  >
                    {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/auth"
                    className="text-sm text-slate-600 hover:text-orange-600 flex items-center justify-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    العودة لتسجيل الدخول
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-emerald-200">
              <CardContent className="p-10 text-center">
                <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold mb-2">
                  تم الإرسال! ✉️
                </h2>
                <p className="text-slate-600 mb-6">
                  إذا كان البريد الإلكتروني{" "}
                  <strong className="text-slate-900">{email}</strong> مسجلاً لدينا،
                  فقد تم إرسال رابط إعادة تعيين كلمة المرور.
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  تحقق من صندوق الوارد (أو البريد المزعج) وافتح الرابط لإعادة تعيين كلمة المرور.
                </p>
                <Link to="/auth">
                  <Button
                    variant="outline"
                    className="rounded-full"
                  >
                    العودة لتسجيل الدخول
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
