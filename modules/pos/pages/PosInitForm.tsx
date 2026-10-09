import { useEffect, useState } from "react";
import { useAuthStore } from "@modules/auth/store/useAuthStore";
import { usePosSessionStore } from "@modules/pos/store/usePosSessionStore";
import { Button } from "@shared/components/ui/Button";
import { 
  Shift, 
  Station, 
  getShifts, 
  getStations, 
  openPosSession 
} from "@shared/services/tauri";

export function PosInitForm() {
  const user = useAuthStore((state) => state.user);
  const setSession = usePosSessionStore((state) => state.setSession);

  const [schedules, setSchedules] = useState<Shift[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  
  const [selectedSchedule, setSelectedSchedule] = useState<number>(0);
  const [selectedStation, setSelectedStation] = useState<number>(0);
  
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [password, setPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [schedulesData, stationsData] = await Promise.all([
          getShifts(),
          getStations()
        ]);
        setSchedules(schedulesData);
        setStations(stationsData);
        
        if (schedulesData.length > 0) setSelectedSchedule(schedulesData[0].id);
        if (stationsData.length > 0) setSelectedStation(stationsData[0].id);
      } catch (err) {
        setError("Gagal memuat data master dari database.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError("User tidak ditemukan, silakan login ulang.");
    if (!selectedSchedule || !selectedStation) return setError("Pilih Jadwal Shift dan Mesin POS terlebih dahulu.");
    if (openingCash < 0) return setError("Uang modal awal tidak boleh minus.");

    setIsSubmitting(true);
    setError("");

    try {
      const session = await openPosSession({
        username: user.username,
        password,
        schedule_id: selectedSchedule,
        station_id: selectedStation,
        opening_cash: openingCash
      });
      
      setSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka kasir.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center">Memuat konfigurasi POS...</div>;

  return (
    <div className="flex h-full min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Buka Kasir</h2>
        <p className="mt-2 text-sm text-slate-500">
          Hai, <strong>{user?.full_name}</strong>. Silakan isi modal awal dan pilih konfigurasi shift.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jadwal Shift</label>
            <select 
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(Number(e.target.value))}
            >
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mesin POS (Station)</label>
            <select 
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              value={selectedStation}
              onChange={(e) => setSelectedStation(Number(e.target.value))}
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* PERBAIKAN 3: Input untuk Uang Modal / Opening Cash */}
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Uang Laci (Modal Awal)</label>
             <input 
               type="number"
               min="0"
               className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
               value={openingCash}
               onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value) && value.length <= 7) {
                  setOpeningCash(value === "" ? 0 : Number(value));
                }
              }}
               placeholder="Contoh: 150000"
               required
             />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Validasi Password</label>
             <input 
               type="password"
               className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder="Masukkan password Anda"
               required
             />
          </div>

          <Button type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            Mulai Shift
          </Button>
        </form>
      </div>
    </div>
  );
}