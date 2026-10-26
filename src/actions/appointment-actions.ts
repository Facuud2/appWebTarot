import { callRpc } from "@/lib/rpc-client";
import type { AppointmentFormValues } from "@/schemas/domain";
import type {
  ActionResult,
  Appointment,
  AppointmentStatus,
} from "@/types/domain";

export async function createAppointmentAction(
  input: AppointmentFormValues
): Promise<ActionResult<Appointment>> {
  return callRpc<Appointment>("appointment.create", input);
}

export async function updateAppointmentAction(
  appointmentId: string,
  input: AppointmentFormValues
): Promise<ActionResult<Appointment>> {
  return callRpc<Appointment>("appointment.update", { appointmentId, input });
}

export async function changeAppointmentStatusAction(
  appointmentId: string,
  status: AppointmentStatus
): Promise<ActionResult<Appointment>> {
  return callRpc<Appointment>("appointment.changeStatus", {
    appointmentId,
    status,
  });
}

export async function deleteAppointmentAction(
  appointmentId: string
): Promise<ActionResult<null>> {
  return callRpc<null>("appointment.delete", { appointmentId });
}
