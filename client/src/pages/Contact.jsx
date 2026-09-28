import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: 'General', message: '' });

  const handleChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: wire up apiClient.contact(form)
    setSent(true);
  };

  return (
    <StaticPage eyebrow="Get in touch" title="Contact us" subtitle="Sawaal, feedback, ya partnership — sab welcome hai." maxWidth="max-w-5xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Info */}
        <div className="space-y-4">
          <a href="mailto:hello@utsavx.com" className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-5 hover:border-coral">
            <Mail className="mt-0.5 h-5 w-5 text-coral" />
            <div>
              <p className="font-bold">Email</p>
              <p className="text-sm text-ink/60">hello@utsavx.com</p>
            </div>
          </a>
          <a href="tel:+919999999999" className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-5 hover:border-coral">
            <Phone className="mt-0.5 h-5 w-5 text-coral" />
            <div>
              <p className="font-bold">Phone</p>
              <p className="text-sm text-ink/60">+91 99999 99999</p>
              <p className="text-xs text-ink/45">Mon–Sat, 10am–7pm IST</p>
            </div>
          </a>
          <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-5">
            <MapPin className="mt-0.5 h-5 w-5 text-coral" />
            <div>
              <p className="font-bold">Office</p>
              <p className="text-sm text-ink/60">UTSAVX Pvt Ltd<br />Bandra West, Mumbai 400050</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          {sent ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-coral/10">
                <Send className="h-5 w-5 text-coral" />
              </div>
              <h3 className="serif mt-4 text-2xl">Message sent!</h3>
              <p className="mt-2 text-sm text-ink/60">Hum 24 hours me reply karenge.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Name" value={form.name} onChange={handleChange('name')} required />
              <Field label="Email" type="email" value={form.email} onChange={handleChange('email')} required />
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink/55">Subject</label>
                <select
                  value={form.subject}
                  onChange={handleChange('subject')}
                  className="mt-1 w-full rounded-xl border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none focus:border-coral"
                >
                  {['General', 'Support', 'Partnership', 'Press', 'Careers'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink/55">Message</label>
                <textarea
                  rows={5}
                  required
                  value={form.message}
                  onChange={handleChange('message')}
                  className="mt-1 w-full rounded-xl border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none focus:border-coral"
                />
              </div>
              <button type="submit" className="w-full rounded-full bg-coral px-6 py-3 font-bold text-white hover:opacity-90">
                Send message
              </button>
            </form>
          )}
        </div>
      </div>
    </StaticPage>
  );
}

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-ink/55">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-xl border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none focus:border-coral"
      />
    </div>
  );
}
