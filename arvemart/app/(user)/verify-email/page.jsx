import { Suspense } from "react";
import VerifyEmailPage from "../../../components/home/VerifyEmailPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailPage />
    </Suspense>
  );
}
