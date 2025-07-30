import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
  getUsers,
  addUser,
  getAvailabilitiesByUserAndWeek,
  addAvailability,
  deleteAvailability,
  type User,
  type Availability,
} from "../firebase/firebase";
import {
  startOfWeek,
  addWeeks,
  format,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  parse,
  isAfter,
  addDays,
} from "date-fns";
import { it } from "date-fns/locale";

const AvailabilityPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [openAddUserDialog, setOpenAddUserDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weeklyAvailabilities, setWeeklyAvailabilities] = useState<
    Availability[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startHour, setStartHour] = useState<string>("");
  const [startMinute, setStartMinute] = useState<string>("");
  const [endHour, setEndHour] = useState<string>("");
  const [endMinute, setEndMinute] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [availabilityToDelete, setAvailabilityToDelete] =
    useState<Availability | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchAvailabilities(selectedUserId, currentWeekStart);
    }
  }, [selectedUserId, currentWeekStart]);

  const fetchUsers = async () => {
    const data = await getUsers();
    setUsers(data);
    if (data.length > 0 && !selectedUserId) {
      setSelectedUserId(data[0].id!);
    }
  };

  const fetchAvailabilities = async (userId: string, weekStart: Date) => {
    const data = await getAvailabilitiesByUserAndWeek(userId, weekStart);
    setWeeklyAvailabilities(data);
  };

  const handleAddUser = async () => {
    if (newUserName.trim()) {
      await addUser(newUserName.trim());
      setNewUserName("");
      setOpenAddUserDialog(false);
      fetchUsers();
    }
  };

  const handleAddAvailability = async () => {
    if (!selectedUserId || !selectedDate || !startHour || !endHour) {
      setError("Per favore, compila tutti i campi per la disponibilità.");
      return;
    }

    const paddedStartHour = startHour.padStart(2, "0");
    const paddedStartMinute = startMinute.padStart(2, "0");
    const paddedEndHour = endHour.padStart(2, "0");
    const paddedEndMinute = endMinute.padStart(2, "0");

    const finalStartTime = `${paddedStartHour}:${paddedStartMinute}`;
    const finalEndTime = `${paddedEndHour}:${paddedEndMinute}`;

    const startHourNum = parseInt(startHour);
    const startMinuteNum = parseInt(startMinute) || 0;
    const endHourNum = parseInt(endHour);
    const endMinuteNum = parseInt(endMinute) || 0;

    if (
      isNaN(startHourNum) ||
      startHourNum < 0 ||
      startHourNum > 23 ||
      isNaN(startMinuteNum) ||
      startMinuteNum < 0 ||
      startMinuteNum > 59 ||
      isNaN(endHourNum) ||
      endHourNum < 0 ||
      endHourNum > 23 ||
      isNaN(endMinuteNum) ||
      endMinuteNum < 0 ||
      endMinuteNum > 59
    ) {
      setError(
        "Per favore, inserisci orari e minuti validi (HH:0-23, MM:0-59)."
      );
      return;
    }

    const dateString = format(selectedDate, "yyyy-MM-dd");
    const startDateTime = parse(
      `${dateString}T${finalStartTime}`,
      "yyyy-MM-dd'T'HH:mm",
      new Date()
    );
    let endDateTime = parse(
      `${dateString}T${finalEndTime}`,
      "yyyy-MM-dd'T'HH:mm",
      new Date()
    );

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setError("Formato orario non valido. Usa HH:MM.");
      return;
    }

    let finalEndDateForComparison = selectedDate;
    if (isAfter(startDateTime, endDateTime)) {
      endDateTime = addDays(endDateTime, 1);
      finalEndDateForComparison = addDays(selectedDate, 1);
    } else if (
      isSameDay(startDateTime, endDateTime) &&
      isAfter(startDateTime, endDateTime)
    ) {
      setError(
        "L'orario di fine non può essere prima dell'orario di inizio nello stesso giorno."
      );
      return;
    }
    const overlappingAvailability = weeklyAvailabilities.some(
      (existingDisp) => {
        const existingDispStart = parse(
          `${existingDisp.date}T${existingDisp.startTime}`,
          "yyyy-MM-dd'T'HH:mm",
          new Date()
        );
        let existingDispEnd = parse(
          `${existingDisp.date}T${existingDisp.endTime}`,
          "yyyy-MM-dd'T'HH:mm",
          new Date()
        );

        if (isAfter(existingDispStart, existingDispEnd)) {
          existingDispEnd = addDays(existingDispEnd, 1);
        }

        const areDatesSameOrAdjacent =
          isSameDay(parseISO(existingDisp.date), selectedDate) ||
          isSameDay(parseISO(existingDisp.date), finalEndDateForComparison);

        return (
          areDatesSameOrAdjacent &&
          startDateTime < existingDispEnd &&
          endDateTime > existingDispStart
        );
      }
    );

    if (overlappingAvailability) {
      setError(
        "Esiste già una disponibilità che si sovrappone a questo orario per l'utente selezionato."
      );
      return;
    }

    try {
      await addAvailability({
        userId: selectedUserId,
        date: dateString,
        startTime: finalStartTime,
        endTime: finalEndTime,
      });
      fetchAvailabilities(selectedUserId, currentWeekStart);
      setStartHour("");
      setStartMinute("");
      setEndHour("");
      setEndMinute("");
      setError("");
    } catch (err) {
      setError("Errore durante l'aggiunta della disponibilità.");
      console.error(err);
    }
  };

  const confirmDeleteAvailability = (availability: Availability) => {
    setAvailabilityToDelete(availability);
    setOpenDeleteConfirmDialog(true);
  };

  const handleDeleteConfirmed = async () => {
    if (availabilityToDelete && availabilityToDelete.id) {
      try {
        await deleteAvailability(availabilityToDelete.id);
        fetchAvailabilities(selectedUserId, currentWeekStart);
        setError("");
      } catch (err) {
        setError("Errore durante l'eliminazione della disponibilità.");
        console.error(err);
      } finally {
        setOpenDeleteConfirmDialog(false);
        setAvailabilityToDelete(null);
      }
    }
  };

  const getWeekDays = (start: Date) => {
    return eachDayOfInterval({
      start: start,
      end: addDays(start, 6),
    }).map((day) => ({
      date: day,
      label: format(day, "EEEE dd/MM", { locale: it }),
    }));
  };

  const daysOfWeek = getWeekDays(currentWeekStart);

  const getAvailabilitiesForDay = (day: Date) => {
    return weeklyAvailabilities.filter((disp) =>
      isSameDay(parseISO(disp.date), day)
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Gestione Disponibilità
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="user-select-label">Seleziona Utente</InputLabel>
          <Select
            labelId="user-select-label"
            id="user-select"
            value={selectedUserId}
            label="Seleziona Utente"
            onChange={(e) => setSelectedUserId(e.target.value as string)}
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddUserDialog(true)}
        >
          Aggiungi Utente
        </Button>
      </Box>

      {selectedUserId && (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 3,
            }}
          >
            <IconButton
              onClick={() =>
                setCurrentWeekStart(addWeeks(currentWeekStart, -1))
              }
            >
              <ArrowBackIosIcon />
            </IconButton>
            <Typography variant="h6" sx={{ mx: 2 }}>
              Settimana dal{" "}
              {format(currentWeekStart, "dd/MM/yyyy", { locale: it })}
            </Typography>
            <IconButton
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            >
              <ArrowForwardIosIcon />
            </IconButton>
          </Box>

          <Paper sx={{ mb: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Aggiungi Nuova Disponibilità
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <TextField
                label="Data"
                type="date"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                onChange={(e) => setSelectedDate(parseISO(e.target.value))}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  label="Ora Inizio"
                  type="number"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  inputProps={{ min: 0, max: 23, maxLength: 2 }}
                  sx={{ width: 80 }}
                />
                <Typography>:</Typography>
                <TextField
                  label="Minuti Inizio"
                  type="number"
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                  inputProps={{ min: 0, max: 59, maxLength: 2 }}
                  sx={{ width: 80 }}
                />
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  label="Ora Fine"
                  type="number"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  inputProps={{ min: 0, max: 23, maxLength: 2 }}
                  sx={{ width: 80 }}
                />
                <Typography>:</Typography>
                <TextField
                  label="Minuti Fine"
                  type="number"
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                  inputProps={{ min: 0, max: 59, maxLength: 2 }}
                  sx={{ width: 80 }}
                />
              </Box>
              <Button variant="contained" onClick={handleAddAvailability}>
                Aggiungi Disponibilità
              </Button>
            </Box>
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Giorno</TableCell>
                  <TableCell>Orari Disponibili</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {daysOfWeek.map((dayObj) => {
                  const disposizioniDelGiorno = getAvailabilitiesForDay(
                    dayObj.date
                  );
                  return (
                    <TableRow key={dayObj.label}>
                      <TableCell>{dayObj.label}</TableCell>
                      <TableCell>
                        {disposizioniDelGiorno.length > 0 ? (
                          <List dense>
                            {disposizioniDelGiorno.map((disp) => (
                              <ListItem
                                key={disp.id}
                                secondaryAction={
                                  <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={() =>
                                      confirmDeleteAvailability(disp)
                                    }
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                }
                              >
                                <ListItemText
                                  primary={`${disp.startTime} - ${disp.endTime}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Nessuna disponibilità
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog
        open={openAddUserDialog}
        onClose={() => setOpenAddUserDialog(false)}
      >
        <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome Utente"
            type="text"
            fullWidth
            variant="standard"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddUserDialog(false)}>Annulla</Button>
          <Button onClick={handleAddUser}>Aggiungi</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openDeleteConfirmDialog}
        onClose={() => setOpenDeleteConfirmDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Conferma Eliminazione Disponibilità"}
        </DialogTitle>
        <DialogContent>
          <Typography id="alert-dialog-description">
            Sei sicuro di voler eliminare la disponibilità{" "}
            {availabilityToDelete?.startTime} - {availabilityToDelete?.endTime}{" "}
            del {availabilityToDelete?.date}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteConfirmDialog(false)}>
            Annulla
          </Button>
          <Button onClick={handleDeleteConfirmed} autoFocus color="error">
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AvailabilityPage;
