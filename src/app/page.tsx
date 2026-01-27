import { getSession } from "@/app/actions/auth";
import { LoginForm } from "@/components/login/LoginForm";

export default async function HomePage() {
  // Ikke redirect automatisk - la LoginForm håndtere redirect etter animasjon
  // Dette gir animasjonen tid til å spille av
  return <LoginForm />;
}
