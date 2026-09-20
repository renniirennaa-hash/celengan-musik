mixin () {
  /// Static Markdown documentation of the backend's public API.
  public query func getApiDoc() : async Text {
    "# API Backend Tabungan dan Musik\n\n" #
    "Backend canister untuk aplikasi target tabungan pribadi sekaligus pustaka\n" #
    "musik bersama. Seluruh data (target, setoran, dan lagu unggahan) disimpan\n" #
    "di canister dalam satu penyimpanan global yang dipakai bersama oleh semua\n" #
    "pemanggil.\n\n" #
    "## Identitas dan otorisasi\n\n" #
    "- Aplikasi memakai login Internet Identity. Identitas pemanggil berasal\n" #
    "  dari Internet Identity yang dipasang oleh frontend. Frontend memakai\n" #
    "  derivation origin aplikasi, yang diterbitkan pada\n" #
    "  `/.well-known/ii-derivation-origin` bila tersedia. Agen yang sudah\n" #
    "  memegang otorisasi Internet Identity pengguna menurunkan principal\n" #
    "  per-aplikasi terhadap origin tersebut (misalnya\n" #
    "  `icp identity link web <name> --app <host>`). Delegasi semacam itu\n" #
    "  bertindak dengan wewenang penuh pengguna di aplikasi ini sampai masa\n" #
    "  berlakunya habis.\n" #
    "- Pendaftaran terjadi hanya saat pemanggil masuk melalui frontend aplikasi\n" #
    "  ini. Pemanggil yang belum pernah melakukannya tetap belum terdaftar,\n" #
    "  walaupun ia adalah pemilik aplikasi. Principal yang diturunkan terhadap\n" #
    "  origin berbeda adalah principal yang berbeda dari yang didaftarkan\n" #
    "  frontend.\n" #
    "- `_initialize_access_control()` mendaftarkan pemanggil yang sudah masuk\n" #
    "  (bukan anonim). Pemanggil pertama menerima peran `#admin`, pemanggil\n" #
    "  berikutnya `#user`. Pemanggil anonim diabaikan tanpa efek. Pemanggil\n" #
    "  langsung melalui API harus memanggilnya sekali sebelum memakai metode\n" #
    "  yang dijaga peran.\n" #
    "- `getCallerUserRole()` mengembalikan peran pemanggil; pemanggil anonim\n" #
    "  menerima `#guest`, pemanggil yang belum terdaftar memicu trap\n" #
    "  `User is not registered`.\n" #
    "- `isCallerAdmin()` mengembalikan `true` hanya untuk peran `#admin`.\n" #
    "- `assignCallerUserRole(user, role)` hanya boleh dipanggil admin; pemanggil\n" #
    "  lain memicu trap `Unauthorized: Only admins can assign user roles`.\n" #
    "- Seluruh metode pengingat (`getReminderSettings`, `saveReminderSettings`,\n" #
    "  `isReminderConfigured`, `sendReminderNow`, `getLastReminderSend`) hanya\n" #
    "  dapat dipanggil admin. Pemanggil anonim atau non-admin memicu trap\n" #
    "  `Akses ditolak: hanya admin yang dapat mengelola pengingat`.\n" #
    "- Metode tabungan dan musik sendiri tidak memeriksa peran dan tidak memakai\n" #
    "  `caller`; keduanya membaca atau mengubah penyimpanan global yang sama,\n" #
    "  sehingga siapa pun yang dapat memanggil canister melihat dan mengubah\n" #
    "  data yang sama. Peran hanya membatasi operasi akses kontrol dan metode\n" #
    "  pengingat di atas.\n\n" #
    "## Tipe data\n\n" #
    "- `GoalId`, `DepositId`, `TrackId`: `Nat` yang bertambah otomatis mulai\n" #
    "  dari 0.\n" #
    "- `Timestamp`: `Int`, nanodetik sejak Unix epoch (waktu pembuatan).\n" #
    "- `DateText`: `Text` berformat `YYYY-MM-DD`.\n" #
    "- `Rupiah`: `Nat`, jumlah Rupiah bulat tanpa pecahan.\n" #
    "- `Storage.ExternalBlob`: referensi blob yang dikelola oleh penyimpanan\n" #
    "  objek platform. Nilainya diterima apa adanya dari klien dan disimpan\n" #
    "  kembali tanpa diubah.\n" #
    "- `SavingsError`: `#goalNotFound(GoalId)`, `#depositNotFound(DepositId)`,\n" #
    "  atau `#invalidInput(Text)`.\n" #
    "- `MusicError`: `#trackNotFound(TrackId)` atau `#invalidInput(Text)`.\n\n" #
    "## Metode target tabungan\n\n" #
    "- `createGoal(input : CreateGoalInput) : async GoalView` — membuat target\n" #
    "  baru. `input` berisi `name`, `photoUrl`, `targetAmount`, `startDate`,\n" #
    "  dan `targetDate`. Mengembalikan target yang dibuat.\n" #
    "- `listGoals() : async [GoalView]` — query; seluruh target yang tersimpan.\n" #
    "- `getGoal(id : Nat) : async ?GoalView` — query; `null` bila target tidak\n" #
    "  ada.\n" #
    "- `deleteGoal(id : Nat) : async Bool` — menghapus target beserta seluruh\n" #
    "  setorannya. Mengembalikan `false` bila target tidak ditemukan.\n\n" #
    "## Metode setoran\n\n" #
    "- `addDeposit(input : CreateDepositInput) : async { #ok : DepositView; #err : SavingsError }`\n" #
    "  — menambah setoran pada target. `input` berisi `goalId`, `amount`,\n" #
    "  `date`, dan `note` opsional. Setoran boleh melebihi nominal target;\n" #
    "  kelebihan tetap tercatat.\n" #
    "- `listDeposits(goalId : Nat) : async [DepositView]` — query; setoran milik\n" #
    "  satu target, terbaru lebih dahulu.\n" #
    "- `updateDeposit(input : UpdateDepositInput) : async { #ok : DepositView; #err : SavingsError }`\n" #
    "  — mengubah `amount`, `date`, dan `note` setoran.\n" #
    "- `deleteDeposit(id : Nat) : async Bool` — menghapus setoran; `false` bila\n" #
    "  tidak ditemukan.\n\n" #
    "## Statistik\n\n" #
    "- `getProgress(goalId : Nat, today : DateText) : async ?GoalProgress` —\n" #
    "  query; total setoran, sisa target, persentase (mentok 100), status\n" #
    "  tercapai, keterlambatan, dan sisa hari dihitung dari `today`.\n" #
    "- `getStats(goalId : Nat) : async ?GoalStats` — query; total, jumlah, dan\n" #
    "  rata-rata setoran serta sisa target.\n" #
    "- `getTrend(goalId : Nat, period : TrendPeriod) : async [TrendPoint]` —\n" #
    "  query; deret setoran per periode `#daily` atau `#monthly`, diurutkan\n" #
    "  menaik secara kronologis (periode terlama lebih dahulu).\n\n" #
    "## Metode musik\n\n" #
    "- `createTrack(input : CreateTrackInput) : async TrackView` — mendaftarkan\n" #
    "  satu lagu unggahan ke pustaka bersama. `input` berisi `title`, `artist`,\n" #
    "  `durationSeconds`, `contentType`, `sizeBytes`, `blob`, dan\n" #
    "  `originalFilename`. Mengembalikan lagu yang dibuat beserta `id` baru.\n" #
    "- `listTracks() : async [TrackView]` — query; seluruh lagu unggahan,\n" #
    "  terbaru lebih dahulu (urut menurun berdasarkan `createdAt`).\n" #
    "- `getTrack(id : Nat) : async ?TrackView` — query; `null` bila lagu tidak\n" #
    "  ada.\n" #
    "- `deleteTrack(id : Nat) : async Bool` — menghapus catatan lagu dari\n" #
    "  pustaka. Mengembalikan `false` bila lagu tidak ditemukan. Bersifat\n" #
    "  destruktif dan tidak dapat dibatalkan.\n\n" #
    "## Kontrak unggah berkas (object storage)\n\n" #
    "- Berkas audio tidak dikirim melalui argumen canister. Klien mengunggah\n" #
    "  byte audio lebih dahulu melalui penyimpanan objek platform (mixin\n" #
    "  `MixinObjectStorage`), lalu memanggil `createTrack` dengan\n" #
    "  `Storage.ExternalBlob` yang dihasilkan.\n" #
    "- `blob` adalah referensi buram; canister tidak membaca, memvalidasi, atau\n" #
    "  mengubah isinya. Klien bertanggung jawab memastikan blob benar-benar\n" #
    "  berisi audio yang cocok dengan `contentType` dan `sizeBytes`.\n" #
    "- `sizeBytes` adalah ukuran berkas dalam byte dan harus sama dengan ukuran\n" #
    "  blob yang diunggah; `durationSeconds` adalah durasi audio dalam detik\n" #
    "  (bilangan bulat).\n" #
    "- `contentType` harus salah satu dari: `audio/mpeg`, `audio/mp3`,\n" #
    "  `audio/wav`, `audio/wave`, `audio/x-wav`, `audio/ogg`, `audio/mp4`,\n" #
    "  `audio/m4a`, `audio/x-m4a`, `audio/aac`. Perbandingan tidak peka huruf\n" #
    "  besar-kecil.\n" #
    "- Batas ukuran berkas adalah 50 MB (52.428.800 byte).\n" #
    "- `originalFilename` hanya metadata nama berkas asli untuk ditampilkan;\n" #
    "  tidak dipakai untuk mengakses blob.\n\n" #
    "## Pengaturan pengingat (admin)\n\n" #
    "- Seluruh metode pengingat hanya dapat dipanggil admin. Pemanggil yang\n" #
    "  bukan admin memicu trap\n" #
    "  `Akses ditolak: hanya admin yang dapat mengelola pengingat`.\n" #
    "- `getReminderSettings() : async ReminderSettingsView` — query; pengaturan\n" #
    "  pengingat saat ini. Rahasia tidak pernah dikembalikan utuh: hanya\n" #
    "  indikator boolean (`accountSidSet`, `apiKeySidSet`, `apiKeySecretSet`)\n" #
    "  dan versi bertopeng (`accountSidMasked`, `apiKeySidMasked`, misalnya\n" #
    "  `AC••••1234`). Nilai bertopeng mempertahankan 4 karakter terakhir; nilai\n" #
    "  sepanjang 4 karakter atau kurang ditampilkan seluruhnya bertopeng\n" #
    "  (`••••`).\n" #
    "- `saveReminderSettings(input : SaveReminderSettingsInput) : async { #ok : ReminderSettingsView; #err : ReminderError }`\n" #
    "  — menyimpan pengaturan. `input` berisi `phoneNumber`, `senderNumber`,\n" #
    "  `accountSid`, `apiKeySid`, `apiKeySecret`, dan `enabled`.\n" #
    "  - `phoneNumber` wajib berformat Indonesia: diawali `+62` diikuti minimal\n" #
    "    satu digit. Nomor tidak valid ditolak dengan\n" #
    "    `#invalidPhoneNumber(\"Nomor HP harus dalam format Indonesia, contoh +628123456789\")`.\n" #
    "  - `senderNumber` wajib berformat internasional E.164: diawali `+`\n" #
    "    diikuti digit. Nomor tidak valid ditolak dengan\n" #
    "    `#invalidSenderNumber(\"Nomor pengirim harus dalam format internasional, contoh +15551234567\")`.\n" #
    "  - `accountSid` harus diawali `AC` dan `apiKeySid` harus diawali `SK`\n" #
    "    bila diisi; jika tidak, hasilnya\n" #
    "    `#invalidCredentials(\"Account SID harus diawali 'AC'\")` atau\n" #
    "    `#invalidCredentials(\"API Key SID harus diawali 'SK'\")`.\n" #
    "  - Bidang rahasia yang dikirim kosong (setelah dipangkas spasi) berarti\n" #
    "    \"pertahankan nilai yang tersimpan\"; nilai lama tidak berubah. Untuk\n" #
    "    mengganti kredensial, kirim nilai baru yang lengkap.\n" #
    "  - `enabled` disimpan apa adanya dan mengendalikan apakah timer harian\n" #
    "    benar-benar mengirim pesan.\n" #
    "- `isReminderConfigured() : async Bool` — query; `true` hanya bila nomor\n" #
    "  tujuan, nomor pengirim, dan ketiga kredensial Twilio sudah tersimpan.\n" #
    "- `sendReminderNow() : async SendResult` — mengirim SMS pengingat saat ini\n" #
    "  juga. Bila belum terkonfigurasi, tidak ada SMS yang dikirim dan hasilnya\n" #
    "  `success = false` dengan pesan penjelas. Kegagalan pengiriman (misalnya\n" #
    "  kredensial salah atau jaringan) juga dikembalikan sebagai\n" #
    "  `success = false`, bukan trap, sehingga pemanggil dapat mencoba lagi.\n" #
    "- `getLastReminderSend() : async ?LastSendResult` — query; hasil\n" #
    "  pengiriman terakhir (`timestamp`, `success`, `message`), atau `null` bila\n" #
    "  belum pernah ada percobaan pengiriman.\n" #
    "- Isi pesan berbahasa Indonesia memuat sapaan, ajakan mencatat setoran\n" #
    "  hari ini, dan ringkasan singkat progres target aktif (target terbaru\n" #
    "  berdasarkan `createdAt`). Bila belum ada target, dipakai ajakan umum.\n\n" #
    "## Siklus hidup dan polling\n\n" #
    "- `createTrack` bersifat sinkron: setelah ia mengembalikan `TrackView`,\n" #
    "  lagu sudah tersimpan dan langsung muncul di `listTracks`. Tidak ada\n" #
    "  status menunggu atau proses latar, sehingga tidak perlu polling.\n" #
    "- `deleteTrack` juga sinkron: setelah mengembalikan `true`, lagu langsung\n" #
    "  hilang dari `listTracks`.\n" #
    "- `listTracks` dan `getTrack` adalah query; keduanya membaca state saat\n" #
    "  ini juga dan tidak pernah mengubah apa pun.\n" #
    "- Pengingat harian otomatis dijadwalkan pada pukul 19:00 WIB (12:00 UTC)\n" #
    "  setiap hari. Timer satu-kali dipasang dengan jeda ke batas 12:00 UTC\n" #
    "  berikutnya, lalu dipasang ulang setelah setiap kali menyala, sehingga\n" #
    "  waktu kirim tetap selaras dengan jam dinding dan tidak bergeser\n" #
    "  mengikuti waktu mulai canister. Timer ini bersifat transient: ia\n" #
    "  dipasang ulang setiap kali canister mulai, dan tidak disimpan melintasi\n" #
    "  upgrade. Pengiriman otomatis hanya terjadi bila pengingat aktif\n" #
    "  (`enabled`) dan sudah terkonfigurasi; untuk pengiriman yang pasti,\n" #
    "  gunakan `sendReminderNow()`.\n" #
    "- `sendReminderNow` bersifat sinkron terhadap hasil: setelah ia\n" #
    "  mengembalikan `SendResult`, hasilnya sudah tercatat dan langsung\n" #
    "  terlihat di `getLastReminderSend`. Tidak perlu polling.\n\n" #
    "## Keamanan pengulangan mutasi\n\n" #
    "- `createTrack` tidak idempoten: setiap panggilan yang berhasil membuat\n" #
    "  `id` baru dan menambah satu baris. Panggilan ulang setelah kegagalan\n" #
    "  jaringan dapat menghasilkan lagu ganda; hapus duplikatnya dengan\n" #
    "  `deleteTrack`.\n" #
    "- `deleteTrack` idempoten terhadap hasil akhir: memanggilnya dua kali\n" #
    "  untuk `id` yang sama hanya menghapus sekali, dan panggilan kedua\n" #
    "  mengembalikan `false`.\n" #
    "- Karena penyimpanan bersifat global, perubahan dari satu pemanggil\n" #
    "  langsung terlihat oleh pemanggil lain.\n" #
    "- `saveReminderSettings` idempoten terhadap nilai akhir: menyimpan input\n" #
    "  yang sama dua kali menghasilkan pengaturan yang sama. Namun bidang\n" #
    "  rahasia yang kosong berarti \"pertahankan nilai lama\", jadi panggilan\n" #
    "  ulang dengan bidang rahasia kosong tidak menghapus kredensial.\n" #
    "- `sendReminderNow` **tidak idempoten**: setiap panggilan yang berhasil\n" #
    "  mengirim satu SMS baru dan **mengenakan biaya nyata** pada akun Twilio.\n" #
    "  Panggilan ulang setelah kegagalan jaringan dapat mengirim pesan ganda.\n" #
    "  Jangan panggil berulang tanpa alasan; periksa `getLastReminderSend`\n" #
    "  terlebih dahulu.\n\n" #
    "## Kesalahan dan batasan\n\n" #
    "- `createTrack` memicu trap (bukan mengembalikan `#err`) untuk input tidak\n" #
    "  valid, dengan pesan persis berikut:\n" #
    "  - `Judul lagu tidak boleh kosong.` — `title` kosong atau hanya spasi.\n" #
    "  - `Format file tidak didukung. Gunakan mp3, wav, ogg, atau m4a.` —\n" #
    "    `contentType` di luar daftar yang didukung.\n" #
    "  - `File audio kosong.` — `sizeBytes` bernilai 0.\n" #
    "  - `Ukuran file melebihi batas 50 MB.` — `sizeBytes` melebihi\n" #
    "    52.428.800 byte.\n" #
    "  Karena trap membatalkan seluruh pesan, tidak ada lagu yang tersimpan\n" #
    "  saat validasi gagal. Perbaiki input lalu panggil ulang.\n" #
    "- `getTrack` dan `deleteTrack` tidak memicu trap untuk `id` yang tidak\n" #
    "  ada; keduanya mengembalikan `null` dan `false`.\n" #
    "- `addDeposit` dan `updateDeposit` mengembalikan `#err` alih-alih trap\n" #
    "  untuk kesalahan yang dapat diperbaiki pemanggil, sehingga aman untuk\n" #
    "  dicoba ulang setelah input diperbaiki.\n" #
    "- `deleteGoal` bersifat destruktif dan tidak dapat dibatalkan: seluruh\n" #
    "  setoran target tersebut ikut terhapus.\n" #
    "- `saveReminderSettings` mengembalikan `#err` alih-alih trap untuk input\n" #
    "  yang dapat diperbaiki pemanggil (`#invalidPhoneNumber`,\n" #
    "  `#invalidSenderNumber`, `#invalidCredentials`), sehingga aman dicoba\n" #
    "  ulang setelah input diperbaiki.\n" #
    "- `sendReminderNow` tidak pernah trap karena kegagalan pengiriman; ia\n" #
    "  mengembalikan `success = false` beserta pesan. Yang memicu trap hanyalah\n" #
    "  pemanggil yang bukan admin.\n" #
    "- Metode pengingat yang dipanggil pemanggil anonim atau non-admin memicu\n" #
    "  trap `Akses ditolak: hanya admin yang dapat mengelola pengingat`.\n\n" #
    "## Akses data (OQL)\n\n" #
    "- `schema() : async Text` — query; dokumen JSON skema entitas yang boleh\n" #
    "  dibaca pemanggil.\n" #
    "- `execute(qJson : Text) : async Result` — query; menjalankan kueri JSON\n" #
    "  terhadap entitas yang diotorisasi. Kueri tidak valid memicu trap\n" #
    "  `OQL: invalid query — <pesan>`.\n" #
    "- Entitas `goal` (tabel target), `deposit` (tabel setoran), dan `track`\n" #
    "  (tabel lagu unggahan) memakai otorisasi per tabel `#public_`: setiap\n" #
    "  pemanggil, termasuk anonim, membaca seluruh baris. Ini sesuai dengan\n" #
    "  penyimpanan global bersama tanpa login; tidak ada pemisahan baris per\n" #
    "  pemanggil.\n" #
    "- Kolom `goalId` pada entitas `deposit` adalah foreign key ke entitas\n" #
    "  `goal`, sehingga kueri dapat menelusuri `goalId.name`.\n" #
    "- Kolom `blob` pada entitas `track` adalah referensi blob, bukan isi\n" #
    "  audio; kueri mengembalikan referensinya saja.\n" #
    "- Pengaturan pengingat tidak diekspos sebagai entitas OQL: state-nya\n" #
    "  berupa satu objek pengaturan tunggal (bukan koleksi baris), sehingga\n" #
    "  tidak dipetakan ke tabel. Gunakan `getReminderSettings` untuk membaca\n" #
    "  pengaturan.\n\n" #
    "## Aturan pemakaian\n\n" #
    "- Semua metode baca bersifat idempoten; hanya `createGoal`, `deleteGoal`,\n" #
    "  `addDeposit`, `updateDeposit`, `deleteDeposit`, `createTrack`,\n" #
    "  `deleteTrack`, `saveReminderSettings`, dan `sendReminderNow` yang\n" #
    "  mengubah state.\n" #
    "- `getApiDoc` mengembalikan dokumen statis ini dan tidak membaca state.\n";
  };
};
