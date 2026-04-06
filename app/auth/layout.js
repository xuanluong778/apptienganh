import AuthBodyClass from "./auth-body-class";

export default function AuthLayout({ children }) {
  return (
    <>
      <AuthBodyClass />
      {children}
    </>
  );
}
