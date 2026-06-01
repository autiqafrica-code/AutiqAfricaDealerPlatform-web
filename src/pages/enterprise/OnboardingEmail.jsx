import { Mail, MessageCircle, Send } from 'lucide-react'

const clients = []

export default function OnboardingEmail() {
  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Onboarding notification</p>
        <h2>Send onboarding email and WhatsApp after setup</h2>
        <p>Notify the dealer CEO and workshop contacts when the workspace, modules, users, currencies and invoice format are ready.</p>
      </div>
      <div className="grid two">
        <div className="panel formPanel">
          <h3>Notification setup</h3>
          <div className="formGrid">
            <label>Client<select>{clients.map((client) => <option key={client.name}>{client.name}</option>)}</select></label>
            <label>Recipient CEO email<input defaultValue="ceo@dealer.com" /></label>
            <label>CEO WhatsApp number<input defaultValue="+27 82 555 0101" /></label>
            <label>Workshop WhatsApp number<input defaultValue="+27 82 555 0102" /></label>
            <label className="wide">CC emails<input placeholder="workshop@dealer.com, accounts@dealer.com" /></label>
            <label className="wide">Subject<input defaultValue="Welcome to Autiq Africa - Your Dealer Platform is Ready" /></label>
            <label className="wide">WhatsApp message<textarea defaultValue="Welcome to Autiq Africa. Your dealer workspace is ready. Login link: https://app.autiqafrica.com/login. Your users and modules have been configured." /></label>
          </div>
          <div className="channelOptions">
            <label><input type="checkbox" defaultChecked /> Send email notification</label>
            <label><input type="checkbox" defaultChecked /> Send WhatsApp notification</label>
            <label><input type="checkbox" /> Attach user credential summary</label>
            <label><input type="checkbox" /> Attach enabled module summary</label>
          </div>
          <div className="rowActions notificationActions">
            <button className="primaryBtn"><Mail size={16} /> Send Email</button>
            <button className="primaryBtn"><MessageCircle size={16} /> Send WhatsApp</button>
            <button className="softBtn"><Send size={16} /> Send Both</button>
          </div>
        </div>
        <div className="panel emailPreview">
          <h3>Email / WhatsApp preview</h3>
          <p>Hello CEO,</p>
          <p>Your Autiq Africa dealer workspace has been configured. Your workshops, users, modules, currency and invoice format are ready.</p>
          <ul>
            <li>Login link: https://app.autiqafrica.com/login</li>
            <li>Modules: Service, Paint & Panel, Accounts, Customer Portal</li>
            <li>Credential setup: completed by Enterprise Admin</li>
            <li>Support: support@autiqafrica.com</li>
          </ul>
          <div className="whatsappPreview">
            <strong>WhatsApp version</strong>
            <p>Welcome to Autiq Africa. Your dealer workspace is ready. Use the login link shared by the Enterprise Admin. User credentials can be reset and shared by email or WhatsApp.</p>
          </div>
          <p>Regards,<br />Autiq Africa Enterprise Team</p>
        </div>
      </div>
    </section>
  )
}
