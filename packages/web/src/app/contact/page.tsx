'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PollsticsShell } from '@/components/site/PollsticsShell';

export default function ContactPage() {
  const [lang, setLang] = useState('hi');
  const hi = lang === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '2px solid #141414',
    borderRadius: 0,
    padding: '12px 14px',
    fontSize: 16,
    outlineColor: '#7a0f1a',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
    color: '#141414',
  };

  const contactItems = [
    {
      label: L('सामान्य पूछताछ', 'General'),
      value: 'contact@pollstics.com',
    },
    {
      label: L('ख़बर या सूचना भेजें', 'News tips'),
      value: 'tips@pollstics.com',
    },
    {
      label: L('विज्ञापन', 'Advertising'),
      value: 'ads@pollstics.com',
    },
  ];

  return (
    <PollsticsShell activeNav="" lang={lang} setLang={setLang}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 14, color: '#666', padding: '18px 0 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#7a0f1a', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
          <span>&gt;</span>
          <span>{L('हमारे बारे में', 'About Us')}</span>
        </nav>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(34px,5vw,56px)',
            fontWeight: 800,
            lineHeight: 1.1,
            margin: '0 0 16px',
            color: '#141414',
          }}
        >
          {L('कांटैक्ट', 'Contact')}
        </h1>
        <div style={{ borderBottom: '2px solid #141414', marginBottom: 'clamp(28px,4vw,48px)' }} />

        {/* Two columns */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(28px,4vw,56px)',
            marginBottom: 'clamp(36px,5vw,56px)',
          }}
        >
          {/* Left: Form */}
          <div style={{ flex: '999 1 440px', maxWidth: 680 }}>
            {sent ? (
              /* Success message */
              <div
                style={{
                  borderTop: '4px solid #7a0f1a',
                  background: '#f4f1f1',
                  padding: 28,
                }}
              >
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px', color: '#141414' }}>
                  {L('धन्यवाद', 'Thank you')}
                </h2>
                <p style={{ fontSize: 16, lineHeight: 1.6, color: '#333', margin: 0 }}>
                  {L(
                    'आपका संदेश हमें मिल गया है। हमारी टीम जल्द आपसे संपर्क करेगी।',
                    'We have received your message. Our team will get back to you soon.',
                  )}
                </p>
              </div>
            ) : (
              /* Form */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {/* Name */}
                <div>
                  <label style={labelStyle}>{L('नाम', 'Name')}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={set('name')}
                    style={inputStyle}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={labelStyle}>{L('ईमेल', 'Email')}</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={set('email')}
                    style={inputStyle}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={labelStyle}>{L('फ़ोन (वैकल्पिक)', 'Phone (optional)')}</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    style={inputStyle}
                  />
                </div>

                {/* Subject */}
                <div>
                  <label style={labelStyle}>{L('विषय', 'Subject')}</label>
                  <select
                    required
                    value={form.subject}
                    onChange={set('subject')}
                    style={{ ...inputStyle, appearance: 'auto' as React.CSSProperties['appearance'] }}
                  >
                    <option value="">{L('-- चुनें --', '-- Select --')}</option>
                    <option value="general">{L('सामान्य पूछताछ', 'General enquiry')}</option>
                    <option value="tip">{L('ख़बर / सूचना भेजें', 'Send a tip')}</option>
                    <option value="correction">{L('सुधार का अनुरोध', 'Correction request')}</option>
                    <option value="advertising">{L('विज्ञापन / साझेदारी', 'Advertising / partnership')}</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label style={labelStyle}>{L('संदेश', 'Message')}</label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={set('message')}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                {/* Submit */}
                <div>
                  <button
                    type="submit"
                    style={{
                      background: '#7a0f1a',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 16,
                      padding: '14px 24px',
                      border: 0,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#5c0a13')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#7a0f1a')}
                  >
                    {L('भेजें', 'Send')} &rarr;
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right: Contact info sidebar */}
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ borderTop: '2px solid #141414' }}>
              {contactItems.map((item) => (
                <div
                  key={item.value}
                  style={{
                    padding: '18px 0',
                    borderBottom: '1px solid #dcdcdc',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#7a0f1a',
                      marginBottom: 4,
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: '#141414' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PollsticsShell>
  );
}
