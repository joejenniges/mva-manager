import { useAuth } from "../auth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-gray-100">Dashboard</h2>
      <p className="text-gray-400">Welcome, {user?.name}.</p>
    </div>
  );
}
