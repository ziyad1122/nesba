import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ShoppingBag, Lock, CheckCircle, Zap } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1e293b",
      "::placeholder": {
        color: "#94a3b8",
      },
      fontFamily: "IBM Plex Sans Arabic, sans-serif",
    },
    invalid: {
      color: "#ef4444",
    },
  },
  hidePostalCode: false,
};

function CheckoutForm({ product, customerInfo, setCustomerInfo }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  // Initialize Payment Request (Apple Pay / Google Pay)
  useEffect(() => {
    if (!stripe || !product) {
      return;
    }

    const pr = stripe.paymentRequest({
      country: "US",
      currency: "usd",
      total: {
        label: product.title,
        amount: Math.round(product.price * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    // Check if Apple Pay / Google Pay is available
    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
      }
    });

    pr.on("paymentmethod", async (ev) => {
      try {
        // Create payment intent if not exists
        let secret = clientSecret;
        if (!secret) {
          const intentResponse = await axios.post(
            `${API}/payments/create-intent`,
            { product_id: product.id, origin_url: window.location.origin },
            { headers: getAuthHeader() }
          );
          secret = intentResponse.data.clientSecret;
          setClientSecret(secret);
        }

        // Confirm payment
        const { error: confirmError, paymentIntent } =
          await stripe.confirmCardPayment(
            secret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
          );

        if (confirmError) {
          ev.complete("fail");
          toast.error(confirmError.message);
          return;
        }

        ev.complete("success");

        if (paymentIntent.status === "succeeded") {
          // Confirm on backend
          await axios.post(
            `${API}/payments/confirm?payment_intent_id=${paymentIntent.id}`,
            {},
            { headers: getAuthHeader() }
          );

          toast.success("تم الدفع بنجاح!");
          navigate(`/checkout/success?session_id=${paymentIntent.id}`);
        }
      } catch (err) {
        console.error("Payment error:", err);
        ev.complete("fail");
        toast.error("فشلت عملية الدفع");
      }
    });
  }, [stripe, product]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate customer info
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error("يرجى إكمال جميع البيانات المطلوبة");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create Payment Intent
      const intentResponse = await axios.post(
        `${API}/payments/create-intent`,
        { product_id: product.id, origin_url: window.location.origin },
        { headers: getAuthHeader() }
      );

      const { clientSecret } = intentResponse.data;

      // Confirm card payment
      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone,
            },
          },
        });

      if (stripeError) {
        setError(stripeError.message);
        toast.error(stripeError.message);
        return;
      }

      if (paymentIntent.status === "succeeded") {
        // Confirm payment on backend
        await axios.post(
          `${API}/payments/confirm?payment_intent_id=${paymentIntent.id}`,
          {},
          { headers: getAuthHeader() }
        );

        // Navigate to success page
        navigate(`/checkout/success?session_id=${paymentIntent.id}`);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.response?.data?.detail || "فشلت عملية الدفع");
      toast.error(err.response?.data?.detail || "فشلت عملية الدفع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Apple Pay / Google Pay Button */}
      {paymentRequest ? (
        <>
          <Card className="border-2 border-emerald-200 bg-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-emerald-900">
                  دفع سريع تلقائي ⚡
                </h3>
              </div>
              <PaymentRequestButtonElement
                options={{ paymentRequest }}
                className="w-full"
              />
              <p className="text-xs text-emerald-700 text-center mt-2">
                ادفع بضغطة واحدة عبر Apple Pay أو Google Pay
              </p>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-300"></div>
            <span className="text-sm text-slate-500">أو ادفع بالبطاقة</span>
            <div className="flex-1 h-px bg-slate-300"></div>
          </div>
        </>
      ) : (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">💡 نصيحة: دفع أسرع!</p>
                <p className="text-blue-700">
                  استخدم Apple Pay أو Google Pay للدفع بضغطة واحدة. متاح على Safari (iPhone/Mac) أو Chrome (Android)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">معلومات المشتري</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">الاسم الكامل *</Label>
            <Input
              id="name"
              type="text"
              value={customerInfo.name}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, name: e.target.value })
              }
              required
              className="h-12"
              placeholder="أدخل اسمك الكامل"
            />
          </div>

          <div>
            <Label htmlFor="email">البريد الإلكتروني *</Label>
            <Input
              id="email"
              type="email"
              value={customerInfo.email}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, email: e.target.value })
              }
              required
              className="h-12"
              placeholder="example@email.com"
              dir="ltr"
            />
          </div>

          <div>
            <Label htmlFor="phone">رقم الجوال *</Label>
            <Input
              id="phone"
              type="tel"
              value={customerInfo.phone}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, phone: e.target.value })
              }
              required
              className="h-12"
              placeholder="+966xxxxxxxxx"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            معلومات الدفع
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>معلومات البطاقة *</Label>
            <div className="mt-2 p-4 border-2 border-slate-200 rounded-xl bg-white hover:border-emerald-500 transition-colors">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Lock className="w-4 h-4" />
            <span>الدفع آمن ومشفر بواسطة Stripe</span>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg rounded-full"
        data-testid="complete-payment-button"
      >
        {loading ? "جاري المعالجة..." : `إتمام الطلب - $${product.price}`}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stripePromise, setStripePromise] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  useEffect(() => {
    if (!user) {
      toast.error("يجب تسجيل الدخول للشراء");
      navigate("/auth");
      return;
    }

    fetchProduct();
    loadStripeConfig();
  }, [id, user]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("فشل تحميل المنتج");
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const loadStripeConfig = async () => {
    try {
      const response = await axios.get(`${API}/payments/config`);
      const stripe = await loadStripe(response.data.publishableKey);
      setStripePromise(stripe);
    } catch (error) {
      console.error("Failed to load Stripe config:", error);
      toast.error("فشل تحميل نظام الدفع");
    }
  };

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-heading font-bold text-slate-900 mb-8 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-emerald-600" />
            إتمام الطلب
          </h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form - 2/3 */}
            <div className="lg:col-span-2">
              {stripePromise ? (
                <Elements stripe={stripePromise}>
                  <CheckoutForm
                    product={product}
                    customerInfo={customerInfo}
                    setCustomerInfo={setCustomerInfo}
                  />
                </Elements>
              ) : (
                <div className="flex justify-center py-20">
                  <div className="spinner"></div>
                </div>
              )}
            </div>

            {/* Order Summary - 1/3 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-lg">ملخص الطلب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Product Info */}
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={
                          product.cover_image ||
                          "https://images.unsplash.com/photo-1633783714412-c74668a14d73?w=200"
                        }
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 line-clamp-2">
                        {product.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {product.category}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>السعر</span>
                      <span className="font-medium">${product.price}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>عمولة المنصة (2.5%)</span>
                      <span>${(product.price * 0.025).toFixed(2)}</span>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">
                          الإجمالي
                        </span>
                        <span className="text-2xl font-bold text-emerald-600">
                          ${product.price}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Security Badge */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-emerald-900">
                        <p className="font-medium mb-1">دفع آمن ومحمي</p>
                        <p className="text-emerald-700">
                          جميع المعاملات مشفرة ومحمية بواسطة Stripe
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* What you'll get */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">
                      ما ستحصل عليه:
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        تحميل فوري للمنتج
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        وصول غير محدود
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        إيصال رقمي
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
