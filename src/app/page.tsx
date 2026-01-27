import { getSession } from "@/app/actions/auth";
import { LoginForm } from "@/components/login/LoginForm";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    // Ikke redirect automatisk - la LoginForm håndtere redirect etter animasjon
    // Dette gir animasjonen tid til å spille av
    return <LoginForm />;
  } catch (error) {
    console.error("Error in HomePage:", error);
    return <LoginForm />;
  }
}
