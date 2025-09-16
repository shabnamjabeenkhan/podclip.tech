import { Link } from "react-router";

export default function FooterSection() {
  return (
    <footer className="py-16 md:py-32 bg-gray-50 border-t">
      <div className="mx-auto max-w-6xl px-6">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <h3 className="text-lg font-bold text-foreground mb-4">Podclip</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Transform your podcast listening experience with AI-powered summaries and insights.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/dashboard/chat" className="text-muted-foreground hover:text-primary transition-colors">
                  AI Chat
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-muted-foreground hover:text-primary transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link 
                  to="/contact" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:admin@podclip.tech" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Email Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t pt-8 flex flex-col md:flex-row justify-center items-center gap-4">
          <span className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Podclip. All rights reserved.
          </span>
        </div>

        {/* Legal Notice */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            <strong>No Refunds:</strong> All purchases are final. Please review our{" "}
            <Link to="/refund-policy" className="text-primary hover:underline">
              Refund Policy
            </Link>{" "}
            before purchasing.
          </p>
        </div>
      </div>
    </footer>
  );
}
