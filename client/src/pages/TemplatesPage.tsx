import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEntities } from "../hooks/useEntities";
import TagBadge from "../components/TagBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/Toast";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";

interface AppointmentTemplate {
  id: string;
  name: string;
  organization: { id: string; name: string; color: string | null } | null;
  location: { id: string; title: string } | null;
  appointmentTemplateActivities: { activityId: string; activity: { id: string; title: string; color: string } }[];
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, total, page, loading, error, search, setPage, remove } =
    useEntities<AppointmentTemplate>("/api/v1/appointment-templates");
  const searchRef = useRef<HTMLInputElement>(null);

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => navigate(`/templates/${data[i].id}`),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => (document.activeElement as HTMLElement)?.blur(),
    n: () => navigate("/templates/new"),
    ...tableNav.hotkeys,
  });

  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await remove(id);
      toast("Template deleted", "success");
    } catch {
      toast("Failed to delete template", "error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-100">Appointment Templates</h2>
        <button
          onClick={() => navigate("/templates/new")}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Template
          <kbd className="relative -top-px ml-1.5 rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">N</kbd>
        </button>
      </div>

      <div className="mb-4">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search templates...  (S)"
          onChange={(e) => search(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-600/50 bg-red-600/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Organization</th>
              <th className="px-4 py-3 text-left font-medium">Location</th>
              <th className="px-4 py-3 text-left font-medium">Activities</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8"><Spinner className="py-4" /></td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No templates found"
                    description="Create a template for quick appointment creation."
                    action={{ label: "New Template", onClick: () => navigate("/templates/new") }}
                  />
                </td>
              </tr>
            ) : (
              data.map((template, i) => (
                <tr key={template.id} data-row-index={i} className={`border-t border-gray-800 hover:bg-gray-800/50 ${tableNav.selectedIndex === i ? "bg-blue-900/20 outline outline-1 outline-blue-500/50" : ""}`}>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/templates/${template.id}`)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {template.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {template.organization?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {template.location?.title || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {template.appointmentTemplateActivities.map((ata) => (
                        <TagBadge
                          key={ata.activityId}
                          label={ata.activity.title}
                          color={ata.activity.color}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/templates/${template.id}`);
                      }}
                      className="mr-2 text-gray-400 hover:text-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id, template.name);
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <span>{total} templates</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded border border-gray-700 px-3 py-1 hover:bg-gray-800 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-2 py-1">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded border border-gray-700 px-3 py-1 hover:bg-gray-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
