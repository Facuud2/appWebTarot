"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  enterDemoWorkspaceAction,
  loginAction,
  registerAction,
} from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/schemas/domain";

export function AuthPanel() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [enteringDemo, setEnteringDemo] = React.useState(false);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      workspaceName: "",
      email: "",
      password: "",
    },
  });

  const onLogin = async (values: LoginInput) => {
    const res = await loginAction(values);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Bienvenido de nuevo.");
    router.replace("/");
    router.refresh();
  };

  const onRegister = async (values: RegisterInput) => {
    const res = await registerAction(values);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Espacio privado creado.");
    router.replace("/");
    router.refresh();
  };

  const handleEnterDemo = async () => {
    setEnteringDemo(true);
    const res = await enterDemoWorkspaceAction();
    if (!res.ok) {
      toast.error(res.error);
      setEnteringDemo(false);
      return;
    }
    toast.success(res.message ?? "Espacio de demostración abierto.");
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-ink">
              Explorar espacio de demostración
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              Ingresa a «Mesa de Estudio Sur» con lecturas, consultantes, eventos del mazo y notas sobre cartas de ejemplo claramente diferenciadas de cuentas reales.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={enteringDemo}
            onClick={handleEnterDemo}
            className="shrink-0"
          >
            <span>
              {enteringDemo ? "Abriendo…" : "Abrir demostración"}
            </span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-ground p-6">
        <Tabs defaultValue="login">
          <TabsList aria-label="Opciones de acceso">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register">Crear cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="pt-2">
            <form
              onSubmit={loginForm.handleSubmit(onLogin)}
              noValidate
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="login-email" requiredIndicator>
                  Correo electrónico
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@estudio.org"
                  aria-invalid={Boolean(loginForm.formState.errors.email)}
                  aria-describedby={
                    loginForm.formState.errors.email
                      ? "login-email-error"
                      : undefined
                  }
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email ? (
                  <p
                    id="login-email-error"
                    role="alert"
                    className="text-xs text-negative"
                  >
                    {loginForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password" requiredIndicator>
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                    aria-invalid={Boolean(loginForm.formState.errors.password)}
                    aria-describedby={
                      loginForm.formState.errors.password
                        ? "login-password-error"
                        : undefined
                    }
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-ink"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password ? (
                  <p
                    id="login-password-error"
                    role="alert"
                    className="text-xs text-negative"
                  >
                    {loginForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loginForm.formState.isSubmitting}
                className="w-full"
              >
                {loginForm.formState.isSubmitting
                  ? "Verificando credenciales…"
                  : "Entrar a mi espacio"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="pt-2">
            <form
              onSubmit={registerForm.handleSubmit(onRegister)}
              noValidate
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name" requiredIndicator>
                    Tu nombre
                  </Label>
                  <Input
                    id="reg-name"
                    autoComplete="name"
                    placeholder="Ej. Elena Morales"
                    aria-invalid={Boolean(registerForm.formState.errors.name)}
                    {...registerForm.register("name")}
                  />
                  {registerForm.formState.errors.name ? (
                    <p role="alert" className="text-xs text-negative">
                      {registerForm.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="reg-workspace">
                      Nombre del consultorio / espacio
                    </Label>
                    <span className="text-xs text-muted font-normal">
                      Opcional
                    </span>
                  </div>
                  <Input
                    id="reg-workspace"
                    placeholder="Ej. Consultorio Norte, Mesa de Luna..."
                    aria-invalid={Boolean(
                      registerForm.formState.errors.workspaceName
                    )}
                    {...registerForm.register("workspaceName")}
                  />
                  {registerForm.formState.errors.workspaceName ? (
                    <p role="alert" className="text-xs text-negative">
                      {registerForm.formState.errors.workspaceName.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-email" requiredIndicator>
                  Correo electrónico
                </Label>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.org"
                  aria-invalid={Boolean(registerForm.formState.errors.email)}
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email ? (
                  <p role="alert" className="text-xs text-negative">
                    {registerForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-password" requiredIndicator>
                  Contraseña nueva
                </Label>
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Al menos 8 caracteres"
                  aria-invalid={Boolean(registerForm.formState.errors.password)}
                  {...registerForm.register("password")}
                />
                <p className="text-xs text-muted">
                  Tu espacio privado nace vacío y aislado; ningún otro usuario puede consultar tus registros.
                </p>
                {registerForm.formState.errors.password ? (
                  <p role="alert" className="text-xs text-negative">
                    {registerForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={registerForm.formState.isSubmitting}
                className="w-full"
              >
                {registerForm.formState.isSubmitting
                  ? "Creando espacio…"
                  : "Crear cuenta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
