import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/apiClient';

// ── إصلاح أيقونات Leaflet مع Webpack ──────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const userColorMap = {};
let colorIdx = 0;

function getUserColor(userId) {
  if (!userColorMap[userId]) {
    userColorMap[userId] = COLORS[colorIdx % COLORS.length];
    colorIdx++;
  }
  return userColorMap[userId];
}

function createColoredIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};border:2px solid #fff;
      transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

export default function LocationMapPage() {
  const { user }            = useSelector((s) => s.auth);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [mobileTab, setMobileTab] = useState('map'); // 'map' | 'list'
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const mapContainerRef = useRef(null); // div حاوي الخريطة
  const mapRef          = useRef(null); // Leaflet map instance
  const markersRef      = useRef({});   // visit_id → marker

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── جلب البيانات من API ─────────────────────────────────────────────────
  useEffect(() => {
    api.get('/visits/locations')
      .then((r) => setVisits(r.data))
      .catch((e) => setError(e.response?.data?.message || 'خطأ في التحميل'))
      .finally(() => setLoading(false));
  }, []);

  // ── تهيئة الخريطة بعد جلب البيانات ─────────────────────────────────────
  useEffect(() => {
    if (loading || !mapContainerRef.current) return;
    if (mapRef.current) {
      mapRef.current.invalidateSize();
      return;
    }

    const defaultCenter = visits.length > 0
      ? [visits[0].shared_lat, visits[0].shared_lng]
      : [30.0444, 31.2357];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 10,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // إضافة الـ markers
    visits.forEach((v) => {
      if (!v.shared_lat || !v.shared_lng) return;
      const color  = getUserColor(v.user?.user_id);
      const time   = v.shared_at
        ? new Date(v.shared_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
        : '—';

      const marker = L.marker([v.shared_lat, v.shared_lng], {
        icon: createColoredIcon(color),
      }).addTo(map);

      marker.bindPopup(`
        <div style="min-width:180px;font-family:Cairo,sans-serif;direction:rtl;line-height:1.8">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#0f172a">
            👤 ${v.user?.full_name || '—'}
          </div>
          <div style="font-size:12px;color:#374151">
            <div>🩺 الطبيب: <b>${v.doctor?.name || '—'}</b></div>
            <div>🏥 العيادة: <b>${v.clinic?.clinic_name || '—'}</b></div>
            <div>🕐 وقت الشير: <b>${time}</b></div>
            <div style="margin-top:6px">
              📍 <a href="https://www.google.com/maps?q=${v.shared_lat},${v.shared_lng}"
                   target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:600">
                فتح في خرائط Google
              </a>
            </div>
          </div>
        </div>
      `);

      markersRef.current[v.visit_id] = marker;
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading, visits]);

  // تحديث أبعاد الخريطة عند التبديل في الموبايل
  useEffect(() => {
    if (mobileTab === 'map' && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 150);
    }
  }, [mobileTab]);

  // ── الطيران لموقع محدد ──────────────────────────────────────────────────
  const flyTo = (visit) => {
    setSelected(visit.visit_id);
    if (isMobile) {
      setMobileTab('map');
    }
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.flyTo([visit.shared_lat, visit.shared_lng], 15, { duration: 1.2 });
        const marker = markersRef.current[visit.visit_id];
        if (marker) setTimeout(() => marker.openPopup(), 1300);
      }
    }, isMobile ? 200 : 0);
  };

  const reps = [...new Map(visits.map((v) => [v.user?.user_id, v.user])).values()].filter(Boolean);

  const selectedVisitObj = visits.find((v) => v.visit_id === selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 100px)', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {/* شريط التبديل للموبايل */}
      {isMobile && (
        <div style={{ display: 'flex', background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
          <button
            onClick={() => setMobileTab('map')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: mobileTab === 'map' ? '#2563eb' : 'transparent',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>🗺</span>
            <span>الخريطة</span>
          </button>
          <button
            onClick={() => setMobileTab('list')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: mobileTab === 'list' ? '#2563eb' : 'transparent',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📋</span>
            <span>المواقع ({visits.length})</span>
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* ── الشريط الجانبي / القائمة ── */}
        <aside
          style={{
            width: isMobile ? '100%' : 300,
            minWidth: isMobile ? '100%' : 280,
            background: '#0f172a',
            color: '#f8fafc',
            display: isMobile && mobileTab !== 'list' ? 'none' : 'flex',
            flexDirection: 'column',
            borderLeft: isMobile ? 'none' : '1px solid #1e293b',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🗺 خريطة مواقع الزيارات</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {user?.role === 'admin' ? '👑 Admin — جميع المندوبين' : '🏢 Manager — مندوبيك فقط'}
            </div>
            <div style={{
              marginTop: 8, background: '#1e293b', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, color: '#38bdf8',
            }}>
              📍 {visits.length} موقع مشارَك
            </div>
          </div>

          {/* Legend */}
          {reps.length > 0 && (
            <div style={{ padding: '10px 18px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 700 }}>
                المندوبون
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {reps.map((rep) => (
                  <div key={rep.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', padding: '3px 8px', borderRadius: '6px' }}>
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: getUserColor(rep.user_id), flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12 }}>{rep.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* قائمة الزيارات */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {loading && <div style={{ color: '#64748b', textAlign: 'center', marginTop: 30 }}>⏳ جارٍ التحميل...</div>}
            {error && <div style={{ color: '#f87171', textAlign: 'center', marginTop: 30 }}>{error}</div>}
            {!loading && !error && visits.length === 0 && (
              <div style={{ color: '#64748b', textAlign: 'center', marginTop: 30 }}>لا توجد مواقع مشارَكة حتى الآن</div>
            )}

            {visits.map((v) => {
              const color  = getUserColor(v.user?.user_id);
              const isSelc = selected === v.visit_id;
              const time   = v.shared_at
                ? new Date(v.shared_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
                : '—';

              return (
                <div
                  key={v.visit_id}
                  onClick={() => flyTo(v)}
                  style={{
                    background: isSelc ? '#1e3a5f' : '#1e293b',
                    border: `1px solid ${isSelc ? '#38bdf8' : '#334155'}`,
                    borderRadius: 10, padding: '10px 12px',
                    marginBottom: 8, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{v.user?.full_name || '—'}</span>
                    </div>
                    {isMobile && (
                      <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>عرض على الخريطة ↗</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', paddingRight: 18 }}>
                    🩺 {v.doctor?.name || '—'}&nbsp;|&nbsp;🏥 {v.clinic?.clinic_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, paddingRight: 18 }}>
                    🕐 {time}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── الخريطة ── */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: isMobile && mobileTab !== 'map' ? 'none' : 'block',
            height: '100%',
            width: '100%',
          }}
        >
          <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: '#f1f5f9', fontSize: 16, color: '#64748b', zIndex: 999,
            }}>
              ⏳ جارٍ تحميل الخريطة...
            </div>
          )}

          {/* بطاقة الموقع المحدد للموبايل */}
          {isMobile && selectedVisitObj && (
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                right: 16,
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                zIndex: 1000,
                backdropFilter: 'blur(4px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>
                  👤 {selectedVisitObj.user?.full_name}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  🩺 {selectedVisitObj.doctor?.name} | 🏥 {selectedVisitObj.clinic?.clinic_name}
                </div>
              </div>
              <a
                href={`https://www.google.com/maps?q=${selectedVisitObj.shared_lat},${selectedVisitObj.shared_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Google Maps
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
