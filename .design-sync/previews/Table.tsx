import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  Badge,
} from "nixvet-ui";

export const Default = () => (
  <Table>
    <TableCaption>Consultas agendadas para hoje</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Paciente</TableHead>
        <TableHead>Tutor</TableHead>
        <TableHead>Horário</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Rex</TableCell>
        <TableCell>Ana Souza</TableCell>
        <TableCell>09:00</TableCell>
        <TableCell>
          <Badge variant="veterinarian">Confirmado</Badge>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Mel</TableCell>
        <TableCell>João Pereira</TableCell>
        <TableCell>10:30</TableCell>
        <TableCell>
          <Badge variant="secondary">Aguardando</Badge>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Thor</TableCell>
        <TableCell>Marina Rocha</TableCell>
        <TableCell>14:00</TableCell>
        <TableCell>
          <Badge variant="destructive">Cancelado</Badge>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
);
