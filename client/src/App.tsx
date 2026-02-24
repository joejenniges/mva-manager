import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PersonRolesPage from "./pages/PersonRolesPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import DocumentTypesPage from "./pages/DocumentTypesPage";
import LocationsPage from "./pages/LocationsPage";
import LocationForm from "./pages/LocationForm";
import PersonsPage from "./pages/PersonsPage";
import PersonForm from "./pages/PersonForm";
import OrganizationsPage from "./pages/OrganizationsPage";
import OrganizationForm from "./pages/OrganizationForm";
import AppointmentsPage from "./pages/AppointmentsPage";
import AppointmentForm from "./pages/AppointmentForm";
import AppointmentDetail from "./pages/AppointmentDetail";
import DocumentsPage from "./pages/DocumentsPage";
import EventsPage from "./pages/EventsPage";
import EventForm from "./pages/EventForm";
import CalendarPage from "./pages/CalendarPage";
import TemplatesPage from "./pages/TemplatesPage";
import TemplateForm from "./pages/TemplateForm";
import MileagePage from "./pages/MileagePage";
import AdminUsersPage from "./pages/AdminUsersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/new" element={<EventForm />} />
          <Route path="events/:id" element={<EventForm />} />
          <Route path="person-roles" element={<PersonRolesPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="document-types" element={<DocumentTypesPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="locations/new" element={<LocationForm />} />
          <Route path="locations/:id" element={<LocationForm />} />
          <Route path="persons" element={<PersonsPage />} />
          <Route path="persons/new" element={<PersonForm />} />
          <Route path="persons/:id" element={<PersonForm />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="organizations/new" element={<OrganizationForm />} />
          <Route path="organizations/:id" element={<OrganizationForm />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="appointments/new" element={<AppointmentForm />} />
          <Route path="appointments/:id" element={<AppointmentDetail />} />
          <Route path="appointments/:id/edit" element={<AppointmentForm />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="templates/new" element={<TemplateForm />} />
          <Route path="templates/:id" element={<TemplateForm />} />
          <Route path="mileage" element={<MileagePage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
