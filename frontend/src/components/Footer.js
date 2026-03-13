import { Store } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12 mt-20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-heading font-bold">نسبتي</span>
          </div>

          <div className="text-center md:text-right">
            <p className="text-slate-400">
              منصة نسبتي - سوق رقمي للمنتجات الرقمية
            </p>
            <p className="text-slate-500 text-sm mt-2">
              © 2024 جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
