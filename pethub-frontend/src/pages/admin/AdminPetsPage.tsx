import React, { useState, useEffect } from 'react';
import {
  PawPrint,
  Search,
  Filter,
  FileDown,
  Download,
  Eye,
  X,
  User,
  Calendar,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/services/api';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import { formatPetAgeDisplay } from '@/utils/speciesAgeRules';

export default function AdminPetsPage() {
  const [pets, setPets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchPets = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search.trim()) params.append('search', search.trim());
      if (selectedSpecies) params.append('species', selectedSpecies);

      const res = await api.get(`/admin/pets?${params.toString()}`);
      setPets(res.data.pets || []);
      setTotal(res.data.total || 0);
      setStats(res.data.stats || null);
    } catch (error) {
      console.error('Error fetching admin pets', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, [page, selectedSpecies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPets();
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setIsExporting(true);
      const res = await api.get(`/admin/export?type=pets&format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pethub_pets_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <PawPrint size={24} className="text-orange-500" />
            <span>Gestão de Pets</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Plantel completo de animais cadastrados no ecossistema PetHub
          </p>
        </div>

        {/* Action Buttons: PDF (Highlighted) & CSV */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileDown size={15} />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="px-3.5 py-2 bg-white dark:bg-[#1E1F20] hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-[#313335] text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <PawPrint size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total de Pets
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {stats?.total ?? total}
            </p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Novos nos Últimos 30d
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats?.newInLast30Days ?? 0}
            </p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
            Distribuição por Espécie
          </p>
          <div className="flex flex-wrap gap-1.5">
            {stats?.speciesDistribution?.map((s: any) => (
              <span
                key={s.species}
                className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-[#131314] text-neutral-700 dark:text-neutral-300 text-[11px] font-medium border border-neutral-200 dark:border-[#313335] capitalize"
              >
                {s.species}: {s.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-96">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por pet, tutor ou raça..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-[#313335] bg-neutral-50 dark:bg-[#131314] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-all cursor-pointer"
          >
            Buscar
          </button>
        </form>

        {/* Species Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-neutral-400" />
          <select
            value={selectedSpecies}
            onChange={(e) => {
              setSelectedSpecies(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl text-xs border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#131314] text-neutral-900 dark:text-white focus:outline-hidden"
          >
            <option value="">Todas as espécies</option>
            <option value="dog">Cachorro</option>
            <option value="cat">Gato</option>
            <option value="bird">Pássaro / Ave</option>
            <option value="rabbit">Coelho</option>
            <option value="rodent">Roedor</option>
            <option value="other">Outro</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200 dark:border-[#313335] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-[#313335] bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3">Pet</th>
                <th className="px-5 py-3">Espécie / Raça</th>
                <th className="px-5 py-3">Tutor</th>
                <th className="px-5 py-3">Idade / Peso</th>
                <th className="px-5 py-3">Castrado</th>
                <th className="px-5 py-3">Data Cadastro</th>
                <th className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#313335]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-neutral-400 text-xs">
                    Carregando plantel de animais...
                  </td>
                </tr>
              ) : pets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-neutral-400 text-xs">
                    Nenhum pet encontrado para os critérios de busca.
                  </td>
                </tr>
              ) : (
                pets.map((pet) => (
                  <tr key={pet.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                          {pet.photo ? (
                            <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
                          ) : (
                            pet.name[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white text-xs">{pet.name}</p>
                          <p className="text-[11px] text-neutral-400">{pet.gender === 'FEMALE' ? 'Fêmea' : 'Macho'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-neutral-700 dark:text-neutral-300">
                      <span className="font-medium capitalize flex items-center gap-1.5">
                        <SpeciesIcon speciesId={pet.species} size={15} className="text-orange-500 shrink-0" />
                        {pet.species}
                      </span>
                      <span className="text-neutral-400 block text-[11px]">{pet.breed || 'SRD'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {pet.tutor?.name || 'Tutor não vinculado'}
                      </span>
                      <span className="text-neutral-400 block text-[11px]">{pet.tutor?.email || ''}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-400">
                      {pet.weight ? `${pet.weight} kg` : '-'} · {formatPetAgeDisplay(pet)}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {pet.isNeutered ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 size={13} /> Sim
                        </span>
                      ) : (
                        <span className="text-neutral-400">Não informado</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(pet.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedPet(pet)}
                        className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-xs font-semibold text-neutral-800 dark:text-neutral-200 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Eye size={13} /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-neutral-100 dark:border-[#313335] flex items-center justify-between text-xs text-neutral-500">
          <span>
            Exibindo {pets.length} de {total} pet(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-neutral-200 dark:border-[#313335] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="font-semibold text-neutral-900 dark:text-white">Página {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={pets.length < 15}
              className="px-3 py-1 rounded-lg border border-neutral-200 dark:border-[#313335] disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Pet Details Modal */}
      {selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#1E1F20] rounded-2xl shadow-xl border border-neutral-200 dark:border-[#313335] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-[#313335]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                  <PawPrint size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">{selectedPet.name}</h3>
                  <p className="text-xs text-neutral-400 capitalize">
                    {selectedPet.species} · {selectedPet.breed || 'SRD'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPet(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Tutor Details */}
              <div className="p-3.5 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335] space-y-1.5">
                <p className="font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[10px]">
                  Tutor Responsável
                </p>
                <p className="font-semibold text-neutral-900 dark:text-white text-sm">
                  {selectedPet.tutor?.name || 'Tutor não localizado'}
                </p>
                <p className="text-neutral-500">{selectedPet.tutor?.email || '-'}</p>
                <p className="text-neutral-500">{selectedPet.tutor?.phone || 'Telefone não informado'}</p>
              </div>

              {/* Biological & Physical Attributes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335]">
                  <span className="text-neutral-400 block text-[10px] uppercase">Gênero</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                    {selectedPet.gender === 'FEMALE' ? 'Fêmea' : selectedPet.gender === 'MALE' ? 'Macho' : 'Não especificado'}
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335]">
                  <span className="text-neutral-400 block text-[10px] uppercase">Peso</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                    {selectedPet.weight ? `${selectedPet.weight} kg` : 'Não informado'}
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335]">
                  <span className="text-neutral-400 block text-[10px] uppercase">Idade / Nascimento</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                    {formatPetAgeDisplay(selectedPet)}
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335]">
                  <span className="text-neutral-400 block text-[10px] uppercase">Castração</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                    {selectedPet.isNeutered ? 'Castrado' : 'Não castrado'}
                  </span>
                </div>
              </div>

              {/* Vaccination and Health Status */}
              <div className="p-3.5 bg-neutral-50 dark:bg-[#131314] rounded-xl border border-neutral-100 dark:border-[#313335] space-y-2">
                <p className="font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[10px]">
                  Informações de Saúde e Vacinação
                </p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Status Vacinal: <span className="font-semibold text-neutral-900 dark:text-white">{selectedPet.vaccinationStatus || 'Desconhecido'}</span>
                </p>
                {selectedPet.notes && (
                  <div className="pt-2 border-t border-neutral-200 dark:border-[#313335]">
                    <p className="text-neutral-400 text-[10px] uppercase">Observações do Animal</p>
                    <p className="text-neutral-700 dark:text-neutral-300 mt-0.5">{selectedPet.notes}</p>
                  </div>
                )}
              </div>

              <div className="text-neutral-400 text-[11px] pt-1 text-center">
                Cadastrado em {new Date(selectedPet.createdAt).toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-[#131314] border-t border-neutral-200 dark:border-[#313335] flex justify-end">
              <button
                onClick={() => setSelectedPet(null)}
                className="px-4 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
