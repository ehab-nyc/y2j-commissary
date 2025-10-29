import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton />
        
        <Card className="p-6 md:p-8 mt-4">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          
          <div className="space-y-6 text-sm text-muted-foreground">
            <section>
              <p className="text-xs text-muted-foreground mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
              <p>
                Y2J NYC Corp ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our commissary ordering system.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">1. Information We Collect</h2>
              <h3 className="text-lg font-medium mb-2 text-foreground">1.1 Personal Information</h3>
              <p className="mb-2">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name and contact information (email address, phone number)</li>
                <li>Cart identification details (cart name and number)</li>
                <li>Account credentials (username and encrypted password)</li>
                <li>Order history and preferences</li>
                <li>Payment information (processed securely through third-party payment processors)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-medium mb-2 text-foreground">1.2 Automatically Collected Information</h3>
              <p className="mb-2">When you access our service, we may automatically collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Device information and identifiers</li>
                <li>Log data (IP address, browser type, access times)</li>
                <li>Usage data and analytics</li>
                <li>Location data (if you enable GPS tracking features)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">2. How We Use Your Information</h2>
              <p className="mb-2">We use the collected information for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Processing and fulfilling your orders</li>
                <li>Sending order confirmations, updates, and notifications</li>
                <li>Providing customer support and responding to inquiries</li>
                <li>Improving our services and user experience</li>
                <li>Preventing fraud and ensuring security</li>
                <li>Complying with legal obligations</li>
                <li>Sending promotional communications (with your consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">3. SMS Communications</h2>
              <p className="mb-2">
                If you consent to receive SMS messages, we will send you:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-2">
                <li>Order status updates and confirmations</li>
                <li>Delivery notifications</li>
                <li>Account-related alerts</li>
                <li>Promotional offers (you may opt-out at any time)</li>
              </ul>
              <p className="mb-2">
                By providing your phone number and consenting to SMS communications, you agree that message and data rates may apply. You can opt-out of SMS messages at any time by replying STOP to any message or updating your preferences in your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">4. Information Sharing and Disclosure</h2>
              <p className="mb-2">We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Service Providers:</strong> Third-party vendors who perform services on our behalf (payment processing, SMS delivery, analytics)</li>
                <li><strong>Business Partners:</strong> Suppliers and delivery personnel necessary to fulfill your orders</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
              <p className="mt-2">We do not sell your personal information to third parties.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">6. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Order history and transaction records may be retained for accounting and legal compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">7. Your Rights and Choices</h2>
              <p className="mb-2">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your information</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, please contact us using the information provided below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">8. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and remember your preferences. You can control cookies through your browser settings, but disabling cookies may affect functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">9. Children's Privacy</h2>
              <p>
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">10. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">11. Contact Us</h2>
              <p className="mb-2">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="pl-4 space-y-1">
                <p><strong>Y2J NYC Corp</strong></p>
                <p>Email: privacy@y2jnyc.com</p>
                <p>Phone: +1 (718) 728-1530</p>
                <p>Address: 3512 19th Ave, Astoria, NY 11105</p>
              </div>
            </section>

            <section className="pt-4 border-t">
              <p className="text-xs">
                <strong>Consent Acknowledgment:</strong> By using our services and providing your phone number with SMS consent, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
