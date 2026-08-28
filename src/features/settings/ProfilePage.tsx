import { Link } from 'react-router-dom';
import { Bell, GraduationCap, LogOut, Mail, Phone, Settings, Shield } from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, teamOverview, visibleTeams } from '@/store/selectors';
import { ROLE_LABEL } from '@/services/auth';
import { Avatar, Badge, Button, Card, LinkButton, PageHeader } from '@/components/ui';
import { Ring } from '@/components/domain/Charts';
import { relativeDay } from '@/lib/utils';

export default function ProfilePage() {
  const { data, session, signOut } = useClub();
  const staff = currentStaff(data, session?.staffId);
  const teams = visibleTeams(data, staff);

  if (!staff) return null;

  const categories = Array.from(new Set(teams.map((t) => t.category)));

  return (
    <>
      <PageHeader title="Mi perfil" description="Tus datos, tus equipos y tus preferencias." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar name={staff.name} size={80} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] font-semibold leading-tight">{staff.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="brand">{ROLE_LABEL[staff.role]}</Badge>
                {staff.licence && (
                  <Badge tone="neutral">
                    <GraduationCap size={12} /> {staff.licence}
                  </Badge>
                )}
              </div>

              <dl className="mt-5 space-y-2.5 text-[13.5px]">
                <div className="flex items-center gap-2.5">
                  <Mail size={15} className="shrink-0 text-ink-400" />
                  <dd className="text-ink-700">{staff.email}</dd>
                </div>
                {staff.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="shrink-0 text-ink-400" />
                    <dd className="text-ink-700">{staff.phone}</dd>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Shield size={15} className="shrink-0 text-ink-400" />
                  <dd className="text-ink-700">
                    {categories.join(' · ')} — temporada {teams[0]?.season}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-[14.5px] font-semibold">Accesos</h3>
          <div className="mt-3.5 space-y-2">
            <LinkButton to="/app/configuracion" variant="outline" size="sm" block icon={<Settings size={15} />}>
              Configuración
            </LinkButton>
            <LinkButton to="/app/configuracion" variant="outline" size="sm" block icon={<Bell size={15} />}>
              Notificaciones
            </LinkButton>
            <Button variant="danger" size="sm" block icon={<LogOut size={15} />} onClick={signOut}>
              Cerrar sesión
            </Button>
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-7 text-[17px] font-semibold">Equipos que dirijo</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {teams.map((t) => {
          const o = teamOverview(data, t);
          return (
            <Link key={t.id} to={`/app/equipos/${t.id}`} className="card card-hover flex items-center gap-4 p-4">
              <Ring value={o.attendanceRate} size={54} stroke={5} />
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-ink-900">{t.name}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-500">{o.squadSize} jugadores</p>
                <p className="mt-1 truncate text-[12px] text-ink-400">
                  {o.nextSession ? `Entrena ${relativeDay(o.nextSession.date).toLowerCase()}` : 'Sin sesión planificada'}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6 p-5">
        <h3 className="text-[14.5px] font-semibold">Formación y titulación</h3>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-500">
          El club registra la titulación de cada técnico para las inscripciones federativas. Si tu licencia ha cambiado
          o has completado un nuevo curso, avisa al coordinador para que lo actualice en tu ficha.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[staff.licence ?? 'Sin licencia', 'Protección del menor', 'Primeros auxilios'].map((c) => (
            <Badge key={c} tone="neutral">
              {c}
            </Badge>
          ))}
        </div>
      </Card>
    </>
  );
}
