import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function Structure() {
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [bureaux, setBureaux] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/divisions/"),
      api.get("/services/"),
      api.get("/bureaux/"),
    ]).then(([d, s, b]) => {
      setDivisions(d.data.results ?? d.data);
      setServices(s.data.results ?? s.data);
      setBureaux(b.data.results ?? b.data);
    });
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black">Structure administrative</h1>
          <p className="text-neutral-500 mt-1">
            Gestion hiérarchique des divisions, services et bureaux.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-8 space-y-8">
        {divisions.map((division) => (
          <div key={division.id}>
            <div className="rounded-xl border border-neutral-200 px-5 py-4 bg-neutral-50">
              <p className="text-xs text-neutral-400 uppercase tracking-wide">Division</p>
              <p className="text-xl font-bold">{division.nom}</p>
            </div>

            <div className="ml-8 mt-3 space-y-3 border-l-2 border-neutral-200 pl-6">
              {services
                .filter((s) => s.division === division.id)
                .map((service) => (
                  <div key={service.id}>
                    <div className="rounded-xl border border-neutral-200 px-4 py-3">
                      <p className="text-xs text-neutral-400 uppercase tracking-wide">Service</p>
                      <p className="font-semibold">{service.nom}</p>
                    </div>
                    <div className="ml-6 mt-2 space-y-2 border-l-2 border-neutral-100 pl-5">
                      {bureaux
                        .filter((b) => b.service === service.id)
                        .map((bureau) => (
                          <div
                            key={bureau.id}
                            className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm"
                          >
                            <span className="text-neutral-400 uppercase text-[10px] mr-2">
                              Bureau
                            </span>
                            {bureau.nom}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
        {divisions.length === 0 && (
          <p className="text-neutral-400 text-center py-8">
            Aucune division enregistrée pour le moment.
          </p>
        )}
      </div>
    </Layout>
  );
}
