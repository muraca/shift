import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  getShiftsByWeek,
  addShift,
  deleteShift,
  getAvailabilities,
  type User,
  type Shift,
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
  isBefore,
  addDays,
} from "date-fns";
import { it } from "date-fns/locale";

const ShiftsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weeklyShifts, setWeeklyShifts] = useState<Shift[]>([]);
  const [allAvailabilities, setAllAvailabilities] = useState<Availability[]>(
    []
  );

  const [openAddShiftDialog, setOpenAddShiftDialog] = useState(false);
  const [selectedShiftDate, setSelectedShiftDate] = useState<Date | null>(null);
  const [shiftStartHour, setShiftStartHour] = useState<string>("");
  const [shiftStartMinute, setShiftStartMinute] = useState<string>("");
  const [shiftEndHour, setShiftEndHour] = useState<string>("");
  const [shiftEndMinute, setShiftEndMinute] = useState<string>("");
  const [selectedShiftUserId, setSelectedShiftUserId] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchShifts(currentWeekStart);
  }, [currentWeekStart, users]);

  const fetchData = async () => {
    const users = await getUsers();
    setUsers(users);
    const availabilities = await getAvailabilities();
    setAllAvailabilities(availabilities);
  };

  const fetchShifts = async (weekStart: Date) => {
    const data = await getShiftsByWeek(weekStart);
    const shiftsWithUserNames = data.map((shift) => ({
      ...shift,
      userName: users.find((m) => m.id === shift.userId)?.name || "Sconosciuto",
    }));
    setWeeklyShifts(shiftsWithUserNames);
  };

  const handleAddShift = async () => {
    if (!selectedShiftDate || !selectedShiftUserId || !shiftStartHour || !shiftEndHour) {
      setError("Per favore, compila tutti i campi per il turno.");
      return;
    }

    const paddedShiftStartHour = shiftStartHour.padStart(2, "0");
    const paddedShiftStartMinute = shiftStartMinute.padStart(2, "0");
    const paddedShiftEndHour = shiftEndHour.padStart(2, "0");
    const paddedShiftEndMinute = shiftEndMinute.padStart(2, "0");

    const finalShiftStartTime = `${paddedShiftStartHour}:${paddedShiftStartMinute}`;
    const finalShiftEndTime = `${paddedShiftEndHour}:${paddedShiftEndMinute}`;

    const shiftStartHourNum = parseInt(shiftStartHour);
    const shiftStartMinuteNum = parseInt(shiftStartMinute) || 0;
    const shiftEndHourNum = parseInt(shiftEndHour);
    const shiftEndMinuteNum = parseInt(shiftEndMinute) || 0;

    if (
      isNaN(shiftStartHourNum) ||
      shiftStartHourNum < 0 ||
      shiftStartHourNum > 23 ||
      isNaN(shiftStartMinuteNum) ||
      shiftStartMinuteNum < 0 ||
      shiftStartMinuteNum > 59 ||
      isNaN(shiftEndHourNum) ||
      shiftEndHourNum < 0 ||
      shiftEndHourNum > 23 ||
      isNaN(shiftEndMinuteNum) ||
      shiftEndMinuteNum < 0 ||
      shiftEndMinuteNum > 59
    ) {
      setError(
        "Per favore, inserisci orari e minuti validi (HH:0-23, MM:0-59)."
      );
      return;
    }

    // Ora usa finalShiftStartTime e finalShiftEndTime nel resto della funzione
    const dateString = format(selectedShiftDate, "yyyy-MM-dd");
    const startShiftDateTime = parse(
      `${dateString}T${finalShiftStartTime}`,
      "yyyy-MM-dd'T'HH:mm",
      new Date()
    );
    let endShiftDateTime = parse(
      `${dateString}T${finalShiftEndTime}`,
      "yyyy-MM-dd'T'HH:mm",
      new Date()
    );

    if (
      isNaN(startShiftDateTime.getTime()) ||
      isNaN(endShiftDateTime.getTime())
    ) {
      setError("Formato orario non valido. Usa HH:MM.");
      return;
    }

    let finalEndDateForShiftComparison = selectedShiftDate;
    if (isAfter(startShiftDateTime, endShiftDateTime)) {
      endShiftDateTime = addDays(endShiftDateTime, 1);
      finalEndDateForShiftComparison = addDays(selectedShiftDate, 1);
    } else if (
      isSameDay(startShiftDateTime, endShiftDateTime) &&
      isAfter(startShiftDateTime, endShiftDateTime)
    ) {
      setError(
        "L'orario di fine non può essere prima dell'orario di inizio nello stesso giorno."
      );
      return;
    }

    const overlappingShift = weeklyShifts.some((existingShift) => {
      if (existingShift.userId !== selectedShiftUserId) {
        return false;
      }

      const existingShiftStart = parse(
        `${existingShift.date}T${existingShift.startTime}`,
        "yyyy-MM-dd'T'HH:mm",
        new Date()
      );
      let existingShiftEnd = parse(
        `${existingShift.date}T${existingShift.endTime}`,
        "yyyy-MM-dd'T'HH:mm",
        new Date()
      );

      if (isAfter(existingShiftStart, existingShiftEnd)) {
        existingShiftEnd = addDays(existingShiftEnd, 1);
      }

      const areDatesSameOrAdjacent =
        isSameDay(parseISO(existingShift.date), selectedShiftDate) ||
        isSameDay(parseISO(existingShift.date), finalEndDateForShiftComparison);

      return (
        areDatesSameOrAdjacent &&
        startShiftDateTime < existingShiftEnd &&
        endShiftDateTime > existingShiftStart
      );
    });

    if (overlappingShift) {
      setError(
        "Questo utente ha già un turno che si sovrappone a questo orario."
      );
      return;
    }

    try {
      await addShift({
        userId: selectedShiftUserId,
        date: dateString,
        startTime: finalShiftStartTime,
        endTime: finalShiftEndTime,
      });
      fetchShifts(currentWeekStart);
      setOpenAddShiftDialog(false);
      resetShiftForm();
    } catch (err) {
      setError("Errore durante l'aggiunta del turno.");
      console.error(err);
    }
  };

  const confirmDeleteShift = (shift: Shift) => {
    setShiftToDelete(shift);
    setOpenDeleteConfirmDialog(true);
  };

  const handleDeleteConfirmed = async () => {
    if (shiftToDelete && shiftToDelete.id) {
      try {
        await deleteShift(shiftToDelete.id);
        fetchShifts(currentWeekStart);
        setError("");
      } catch (err) {
        setError("Errore durante l'eliminazione del turno.");
        console.error(err);
      } finally {
        setOpenDeleteConfirmDialog(false);
        setShiftToDelete(null);
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

  const getShiftsForDay = (day: Date) => {
    return weeklyShifts.filter((shift) => isSameDay(parseISO(shift.date), day));
  };

  const getSuggestedUsers = (): User[] => {
    if (!selectedShiftDate || !shiftStartHour || !shiftEndHour) {
      return [];
    }

    const dateString = format(selectedShiftDate, "yyyy-MM-dd");
    const startShiftTime = parse(
      `${dateString}T${shiftStartHour}:${shiftStartMinute ?? "00"}`,
      "yyyy-MM-dd'T'HH:mm",
      new Date()
    );
    let endShiftTime = parse(
      `${dateString}T${shiftEndHour}:${shiftEndMinute ?? "00"}`,
      "yyyy-MM-dd'T'HH:mm",
      new Date()
    );

    if (isAfter(startShiftTime, endShiftTime)) {
      endShiftTime = addDays(endShiftTime, 1);
    }

    const availableUserIds = new Set<string>();

    allAvailabilities.forEach((availability) => {
      const availabilityDate = parseISO(availability.date);
      const availabilityStartTime = parse(
        `${availability.date}T${availability.startTime}`,
        "yyyy-MM-dd'T'HH:mm",
        new Date()
      );
      let availabilityEndTime = parse(
        `${availability.date}T${availability.endTime}`,
        "yyyy-MM-dd'T'HH:mm",
        new Date()
      );

      if (isAfter(availabilityStartTime, availabilityEndTime)) {
        availabilityEndTime = addDays(availabilityEndTime, 1);
      }

      const isShiftWithinAvailability =
        isSameDay(availabilityDate, selectedShiftDate) &&
        (isAfter(startShiftTime, availabilityStartTime) ||
          startShiftTime.getTime() === availabilityStartTime.getTime()) &&
        (isBefore(endShiftTime, availabilityEndTime) ||
          endShiftTime.getTime() === availabilityEndTime.getTime());

      if (isShiftWithinAvailability) {
        availableUserIds.add(availability.userId);
      }
    });

    return users.filter((user) => availableUserIds.has(user.id!));
  };

  const suggestedUsers = getSuggestedUsers();

  const resetShiftForm = () => {
    setSelectedShiftDate(null);
    setShiftStartHour("");
    setShiftStartMinute("");
    setShiftEndHour("");
    setShiftEndMinute("");
    setSelectedShiftUserId("");
    setError("");
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Gestione Turni
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mb: 3,
        }}
      >
        <IconButton
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
        >
          <ArrowBackIosIcon />
        </IconButton>
        <Typography variant="h6" sx={{ mx: 2 }}>
          Settimana dal {format(currentWeekStart, "dd/MM/yyyy", { locale: it })}
        </Typography>
        <IconButton
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
        >
          <ArrowForwardIosIcon />
        </IconButton>
      </Box>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => {
          setOpenAddShiftDialog(true);
          resetShiftForm();
        }}
        sx={{ mb: 3 }}
      >
        Crea Nuovo Turno
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Giorno</TableCell>
              <TableCell>Turni Assegnati</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {daysOfWeek.map((dayObj) => {
              const shiftsForDay = getShiftsForDay(dayObj.date);
              return (
                <TableRow key={dayObj.label}>
                  <TableCell>{dayObj.label}</TableCell>
                  <TableCell>
                    {shiftsForDay.length > 0 ? (
                      <List dense>
                        {shiftsForDay.map((shift) => (
                          <ListItem
                            key={shift.id}
                            secondaryAction={
                              <IconButton
                                edge="end"
                                aria-label="delete"
                                onClick={() => confirmDeleteShift(shift)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText
                              primary={`${shift.startTime} - ${shift.endTime} (${shift.userName})`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nessun turno assegnato
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openAddShiftDialog}
        onClose={() => setOpenAddShiftDialog(false)}
      >
        <DialogTitle>Crea Nuovo Turno</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Data Turno"
              type="date"
              value={
                selectedShiftDate ? format(selectedShiftDate, "yyyy-MM-dd") : ""
              }
              onChange={(e) => setSelectedShiftDate(parseISO(e.target.value))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Ora Inizio:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  label="Ora"
                  type="number"
                  value={shiftStartHour}
                  onChange={(e) => setShiftStartHour(e.target.value)}
                  inputProps={{ min: 0, max: 23, maxLength: 2 }}
                  sx={{ width: 80 }}
                />
                <Typography>:</Typography>
                <TextField
                  label="Minuti"
                  type="number"
                  value={shiftStartMinute}
                  onChange={(e) => setShiftStartMinute(e.target.value)}
                  inputProps={{ min: 0, max: 59, maxLength: 2 }}
                  sx={{ width: 80 }}
                />
              </Box>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Ora Fine:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  label="Ora"
                  type="number"
                  value={shiftEndHour}
                  onChange={(e) => setShiftEndHour(e.target.value)}
                  inputProps={{ min: 0, max: 23, maxLength: 2 }}
                  sx={{ width: 80 }}
                />
                <Typography>:</Typography>
                <TextField
                  label="Minuti"
                  type="number"
                  value={shiftEndMinute}
                  onChange={(e) => setShiftEndMinute(e.target.value)}
                  inputProps={{ min: 0, max: 59, maxLength: 2 }}
                  sx={{ width: 80 }}
                />
              </Box>
            </Box>

            {selectedShiftDate &&
              shiftStartHour &&
              shiftEndHour &&
              suggestedUsers.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1">
                    Utenti disponibili per questo slot:
                  </Typography>
                  <List dense>
                    {suggestedUsers.map((user) => (
                      <ListItem key={user.id}>
                        <ListItemText primary={user.name} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="shift-user-select-label">Assegna a</InputLabel>
              <Select
                labelId="shift-user-select-label"
                id="shift-user-select"
                value={selectedShiftUserId}
                label="Assegna a"
                onChange={(e) =>
                  setSelectedShiftUserId(e.target.value as string)
                }
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddShiftDialog(false)}>Annulla</Button>
          <Button onClick={handleAddShift}>Crea Turno</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteConfirmDialog}
        onClose={() => setOpenDeleteConfirmDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Conferma Eliminazione Turno"}
        </DialogTitle>
        <DialogContent>
          <Typography id="alert-dialog-description">
            Sei sicuro di voler eliminare il turno {shiftToDelete?.startTime} -{" "}
            {shiftToDelete?.endTime} del {shiftToDelete?.date} assegnato a{" "}
            {shiftToDelete?.userName}?
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

export default ShiftsPage;
