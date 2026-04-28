import { useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

const emptyCargoForm = {
  date: '',
  carId: '',
  grossWeight: '',
  emptyWeight: '',
  pricePerKg: '',
}

const getTodayDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const parseNumber = (value) => Number(String(value).replace(',', '.')) || 0

const formatWeight = (value) =>
  Number(value.toFixed(1)).toLocaleString('ru-RU').replace('.', ',')

const formatMoney = (value) =>
  Math.round(value).toLocaleString('ru-RU')

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('temir_user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [login, setLogin] = useState('admin')
  const [password, setPassword] = useState('0000')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activePage, setActivePage] = useState('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [carNumber, setCarNumber] = useState('')
  const [cars, setCars] = useState(() => {
    const savedCars = localStorage.getItem('temir_cars')
    return savedCars ? JSON.parse(savedCars) : []
  })
  const [editingCarId, setEditingCarId] = useState(null)
  const [editingNumber, setEditingNumber] = useState('')
  const [cargoForm, setCargoForm] = useState(emptyCargoForm)
  const [cargoEntries, setCargoEntries] = useState(() => {
    const savedCargoEntries = localStorage.getItem('temir_cargo_entries')
    return savedCargoEntries ? JSON.parse(savedCargoEntries) : []
  })
  const [editingCargoId, setEditingCargoId] = useState(null)
  const [dashboardFilters, setDashboardFilters] = useState({
    from: '',
    to: '',
  })

  const grossWeight = parseNumber(cargoForm.grossWeight)
  const emptyWeight = parseNumber(cargoForm.emptyWeight)
  const cargoWeight = Math.max(grossWeight - emptyWeight, 0)
  const discountWeight = cargoWeight * 0.02
  const netWeight = Math.max(cargoWeight - discountWeight, 0)
  const pricePerKg = parseNumber(cargoForm.pricePerKg)
  const totalAmount = netWeight * pricePerKg
  const todayDate = getTodayDate()
  const todayCargoEntries = cargoEntries.filter(
    (entry) => entry.date === todayDate,
  )
  const todayTotalKg = todayCargoEntries.reduce(
    (sum, entry) => sum + entry.netWeight,
    0,
  )
  const todayTotalAmount = todayCargoEntries.reduce(
    (sum, entry) => sum + entry.totalAmount,
    0,
  )
  const filteredCargoEntries = cargoEntries.filter((entry) => {
    const afterFrom = dashboardFilters.from
      ? entry.date >= dashboardFilters.from
      : true
    const beforeTo = dashboardFilters.to ? entry.date <= dashboardFilters.to : true

    return afterFrom && beforeTo
  })
  const totalNetKg = filteredCargoEntries.reduce(
    (sum, entry) => sum + entry.netWeight,
    0,
  )
  const totalAmountAll = filteredCargoEntries.reduce(
    (sum, entry) => sum + entry.totalAmount,
    0,
  )
  const totalCargoWeight = filteredCargoEntries.reduce(
    (sum, entry) => sum + entry.cargoWeight,
    0,
  )
  const averagePrice = totalNetKg ? totalAmountAll / totalNetKg : 0
  const carReports = cars
    .map((car) => {
      const entries = filteredCargoEntries.filter(
        (entry) => entry.carId === car.id,
      )
      const netKg = entries.reduce((sum, entry) => sum + entry.netWeight, 0)
      const amount = entries.reduce((sum, entry) => sum + entry.totalAmount, 0)

      return {
        car,
        count: entries.length,
        netKg,
        amount,
      }
    })
    .sort((first, second) => second.amount - first.amount)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Kirishda xatolik bor')
      }

      localStorage.setItem('temir_user', JSON.stringify(data.user))
      setUser(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('temir_user')
    setUser(null)
  }

  const handleCreateCar = (event) => {
    event.preventDefault()

    const number = carNumber.trim().toUpperCase()

    if (!number) {
      return
    }

    const nextCars = [
      {
        id: crypto.randomUUID(),
        number,
      },
      ...cars,
    ]

    localStorage.setItem('temir_cars', JSON.stringify(nextCars))
    setCars(nextCars)
    setCarNumber('')
  }

  const saveCars = (nextCars) => {
    localStorage.setItem('temir_cars', JSON.stringify(nextCars))
    setCars(nextCars)
  }

  const handleStartEdit = (car) => {
    setEditingCarId(car.id)
    setEditingNumber(car.number)
  }

  const handleCancelEdit = () => {
    setEditingCarId(null)
    setEditingNumber('')
  }

  const handleSaveEdit = (event) => {
    event.preventDefault()

    const number = editingNumber.trim().toUpperCase()

    if (!number) {
      return
    }

    const nextCars = cars.map((car) =>
      car.id === editingCarId ? { ...car, number } : car,
    )

    saveCars(nextCars)
    handleCancelEdit()
  }

  const handleDeleteCar = (carId) => {
    const nextCars = cars.filter((car) => car.id !== carId)
    saveCars(nextCars)

    if (editingCarId === carId) {
      handleCancelEdit()
    }
  }

  const saveCargoEntries = (nextEntries) => {
    localStorage.setItem('temir_cargo_entries', JSON.stringify(nextEntries))
    setCargoEntries(nextEntries)
  }

  const updateCargoField = (field, value) => {
    setCargoForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const resetCargoForm = () => {
    setCargoForm(emptyCargoForm)
    setEditingCargoId(null)
  }

  const handleSaveCargo = (event) => {
    event.preventDefault()

    const selectedCar = cars.find((car) => car.id === cargoForm.carId)

    if (!selectedCar || !cargoForm.date || !grossWeight || !pricePerKg) {
      return
    }

    const cargoEntry = {
      id: editingCargoId || crypto.randomUUID(),
      date: cargoForm.date,
      carId: selectedCar.id,
      carNumber: selectedCar.number,
      grossWeight,
      emptyWeight,
      cargoWeight,
      discountWeight,
      netWeight,
      pricePerKg,
      totalAmount,
    }

    const nextEntries = editingCargoId
      ? cargoEntries.map((entry) =>
          entry.id === editingCargoId ? cargoEntry : entry,
        )
      : [cargoEntry, ...cargoEntries]

    saveCargoEntries(nextEntries)
    resetCargoForm()
  }

  const handleEditCargo = (entry) => {
    setEditingCargoId(entry.id)
    setCargoForm({
      date: entry.date,
      carId: entry.carId,
      grossWeight: String(entry.grossWeight),
      emptyWeight: String(entry.emptyWeight),
      pricePerKg: String(entry.pricePerKg),
    })
    setActivePage('cargo-delivery')
  }

  const handleDeleteCargo = (entryId) => {
    saveCargoEntries(cargoEntries.filter((entry) => entry.id !== entryId))

    if (editingCargoId === entryId) {
      resetCargoForm()
    }
  }

  const handleExportCargoToExcel = () => {
    const rows = cargoEntries.map((entry) => ({
      Sana: entry.date,
      Mashina: entry.carNumber,
      "To'la vazni": entry.grossWeight,
      'Yuksiz vazni': entry.emptyWeight,
      'Qolgan yuki': entry.cargoWeight,
      'Skidka 2%': entry.discountWeight,
      'Qolgan vazn': entry.netWeight,
      'Kilosiga pul': entry.pricePerKg,
      'Aniq summa': Math.round(entry.totalAmount),
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Yuk topshirish')
    XLSX.writeFile(workbook, 'yuk-topshirish.xlsx')
  }

  const handleChangePage = (page) => {
    setActivePage(page)
    setMobileMenuOpen(false)
  }

  if (!user) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">TEMIR BIZNES</p>
            <h1>Kirish</h1>
          </div>

          <label>
            Login
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="admin"
              autoComplete="username"
            />
          </label>

          <label>
            Parol
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="0000"
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Tekshirilmoqda...' : 'Kirish'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="dashboard">
      <header className="mobile-topbar">
        <p>TEMIR BIZNES</p>
        <button type="button" onClick={() => setMobileMenuOpen(true)}>
          Menu
        </button>
      </header>

      {mobileMenuOpen ? (
        <button
          className="menu-backdrop"
          type="button"
          aria-label="Menyuni yopish"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div>
          <div className="sidebar-head">
            <p className="brand">TEMIR BIZNES</p>
            <button
              className="menu-close"
              type="button"
              onClick={() => setMobileMenuOpen(false)}
            >
              Yopish
            </button>
          </div>
          <nav>
            <button
              className={activePage === 'home' ? 'active' : ''}
              type="button"
              onClick={() => handleChangePage('home')}
            >
              Bosh sahifa
            </button>
            <button
              className={activePage === 'cars' ? 'active' : ''}
              type="button"
              onClick={() => handleChangePage('cars')}
            >
              Mashinalar
            </button>
            <button
              className={activePage === 'cargo-delivery' ? 'active' : ''}
              type="button"
              onClick={() => handleChangePage('cargo-delivery')}
            >
              Yuk topshirish
            </button>
            <button
              className={activePage === 'settings' ? 'active' : ''}
              type="button"
              onClick={() => handleChangePage('settings')}
            >
              Sozlamalar
            </button>
          </nav>
        </div>

        <div className="profile">
          <span>{user.login}</span>
          <button type="button" onClick={handleLogout}>
            Chiqish
          </button>
        </div>
      </aside>

      <section className="content">
        <div className="white-page">
          {activePage === 'home' ? (
            <div className="dashboard-page">
              <div className="page-heading dashboard-heading">
                <div>
                  <h1>Bosh sahifa</h1>
                  <p>Temir yig'ish va zavodga topshirish bo'yicha umumiy hisobot.</p>
                </div>
              </div>

              <div className="dashboard-filter">
                <label>
                  Boshlanish sana
                  <input
                    type="date"
                    value={dashboardFilters.from}
                    onChange={(event) =>
                      setDashboardFilters((filters) => ({
                        ...filters,
                        from: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Tugash sana
                  <input
                    type="date"
                    value={dashboardFilters.to}
                    onChange={(event) =>
                      setDashboardFilters((filters) => ({
                        ...filters,
                        to: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="stat-grid">
                <div className="stat-card stat-money stat-card-wide">
                  <span>Jami topilgan pul</span>
                  <strong>{formatMoney(totalAmountAll)} so'm</strong>
                </div>
                <div className="stat-card stat-today-money">
                  <span>Bugungi tushum</span>
                  <strong>{formatMoney(todayTotalAmount)} so'm</strong>
                </div>
                <div className="stat-card stat-kg">
                  <span>Jami sof kg</span>
                  <strong>{formatWeight(totalNetKg)} kg</strong>
                </div>
                <div className="stat-card stat-today-kg">
                  <span>Bugungi sof kg</span>
                  <strong>{formatWeight(todayTotalKg)} kg</strong>
                </div>
                <div className="stat-card stat-cars">
                  <span>Mashinalar</span>
                  <strong>{cars.length}</strong>
                </div>
                <div className="stat-card stat-count">
                  <span>Topshirishlar</span>
                  <strong>{filteredCargoEntries.length}</strong>
                </div>
              </div>

              <div className="dashboard-panels">
                <section className="report-panel">
                  <div className="panel-title">
                    <h2>Mashinalar hisoboti</h2>
                    <span>Jami kg va pul bo'yicha</span>
                  </div>
                  <div className="report-list">
                    {carReports.length ? (
                      carReports.map((report) => (
                        <div className="report-row" key={report.car.id}>
                          <div>
                            <strong>{report.car.number}</strong>
                            <span>{report.count} ta topshirish</span>
                          </div>
                          <div>
                            <strong>{formatWeight(report.netKg)} kg</strong>
                            <span>{formatMoney(report.amount)} so'm</span>
                          </div>
                          <div className="report-progress">
                            <span
                              style={{
                                width: `${
                                  totalAmountAll
                                    ? Math.max(
                                        (report.amount / totalAmountAll) * 100,
                                        5,
                                      )
                                    : 0
                                }%`,
                              }}
                            ></span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty-text">Hali mashina yaratilmagan.</p>
                    )}
                  </div>
                </section>

                <section className="report-panel">
                  <div className="panel-title">
                    <h2>Umumiy ko'rsatkichlar</h2>
                    <span>Zavod hisob-kitobi</span>
                  </div>
                  <div className="metric-list">
                    <div>
                      <span>Skidkagacha yuk</span>
                      <strong>{formatWeight(totalCargoWeight)} kg</strong>
                    </div>
                    <div>
                      <span>Skidkadan keyin</span>
                      <strong>{formatWeight(totalNetKg)} kg</strong>
                    </div>
                    <div>
                      <span>O'rtacha kilo narxi</span>
                      <strong>{formatMoney(averagePrice)} so'm</strong>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : null}

          {activePage === 'cars' ? (
            <div className="cars-page">
              <div className="page-heading">
                <h1>Mashinalar</h1>
                <p>Yangi mashina raqamini kiriting va ro'yxatga qo'shing.</p>
              </div>

              <form className="car-form" onSubmit={handleCreateCar}>
                <input
                  value={carNumber}
                  onChange={(event) => setCarNumber(event.target.value)}
                  placeholder="50V860HD"
                  aria-label="Mashina raqami"
                />
                <button type="submit">Yaratish</button>
              </form>

              <div className="car-list">
                {cars.length ? (
                  cars.map((car) => (
                    <div className="car-item" key={car.id}>
                      {editingCarId === car.id ? (
                        <form className="edit-form" onSubmit={handleSaveEdit}>
                          <input
                            value={editingNumber}
                            onChange={(event) =>
                              setEditingNumber(event.target.value)
                            }
                            aria-label="Mashina raqamini tahrirlash"
                          />
                          <button className="save-button" type="submit">
                            Saqlash
                          </button>
                          <button
                            className="cancel-button"
                            type="button"
                            onClick={handleCancelEdit}
                          >
                            Bekor qilish
                          </button>
                        </form>
                      ) : (
                        <>
                          <span>{car.number}</span>
                          <div className="car-actions">
                            <button
                              className="edit-button"
                              type="button"
                              onClick={() => handleStartEdit(car)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-button"
                              type="button"
                              onClick={() => handleDeleteCar(car.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="empty-text">Hali mashina yaratilmagan.</p>
                )}
              </div>
            </div>
          ) : null}

          {activePage === 'cargo-delivery' ? (
            <div className="cargo-page">
              <div className="page-heading">
                <h1>Yuk topshirish</h1>
                <p>Temir yukini zavodga topshirish ma'lumotlarini kiriting.</p>
              </div>

              <div className="today-summary">
                <div>
                  <span>Bugun qabul qilingan jami kg</span>
                  <strong>{formatWeight(todayTotalKg)} kg</strong>
                </div>
                <div>
                  <span>Zavod bugun bergan pul</span>
                  <strong>{formatMoney(todayTotalAmount)} so'm</strong>
                </div>
              </div>

              <div className="table-toolbar">
                <button
                  type="button"
                  onClick={handleExportCargoToExcel}
                  disabled={!cargoEntries.length}
                >
                  Excelga yuklash
                </button>
              </div>

              <form className="cargo-form" onSubmit={handleSaveCargo}>
                <label>
                  Sana
                  <input
                    type="date"
                    value={cargoForm.date}
                    onChange={(event) =>
                      updateCargoField('date', event.target.value)
                    }
                  />
                </label>

                <label>
                  Mashina
                  <select
                    value={cargoForm.carId}
                    onChange={(event) =>
                      updateCargoField('carId', event.target.value)
                    }
                  >
                    <option value="">Mashina tanlang</option>
                    {cars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.number}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  To'la vazni
                  <input
                    inputMode="decimal"
                    value={cargoForm.grossWeight}
                    onChange={(event) =>
                      updateCargoField('grossWeight', event.target.value)
                    }
                    placeholder="To'la vazni"
                  />
                </label>

                <label>
                  Yuksiz vazni
                  <input
                    inputMode="decimal"
                    value={cargoForm.emptyWeight}
                    onChange={(event) =>
                      updateCargoField('emptyWeight', event.target.value)
                    }
                    placeholder="Yuksiz vazni"
                  />
                </label>

                <div className="calculated-field">
                  <span>Qolgan yuki</span>
                  <strong>{formatWeight(cargoWeight)}</strong>
                </div>

                <div className="calculated-field">
                  <span>Skidka 2%</span>
                  <strong>{formatWeight(discountWeight)}</strong>
                </div>

                <div className="calculated-field highlight-field">
                  <span>Qolgan vazn</span>
                  <strong>{formatWeight(netWeight)}</strong>
                </div>

                <label>
                  Kilosiga pul
                  <input
                    inputMode="numeric"
                    value={cargoForm.pricePerKg}
                    onChange={(event) =>
                      updateCargoField('pricePerKg', event.target.value)
                    }
                    placeholder="Kilosiga pul"
                  />
                </label>

                <div className="amount-box">
                  <span>Aniq summa</span>
                  <strong>{formatMoney(totalAmount)} so'm</strong>
                </div>

                <div className="cargo-form-actions">
                  <button type="submit">
                    {editingCargoId ? 'Saqlash' : 'Yaratish'}
                  </button>
                  {editingCargoId ? (
                    <button type="button" onClick={resetCargoForm}>
                      Bekor qilish
                    </button>
                  ) : null}
                </div>
              </form>

              <div className="cargo-table-wrap">
                <table className="cargo-table">
                  <thead>
                    <tr>
                      <th>Sana</th>
                      <th>Mashina</th>
                      <th>To'la</th>
                      <th>Yuksiz</th>
                      <th>Yuk</th>
                      <th>Skidka</th>
                      <th>Qolgan</th>
                      <th>Narx</th>
                      <th>Summa</th>
                      <th>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargoEntries.length ? (
                      cargoEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td data-label="Sana">{entry.date}</td>
                          <td data-label="Mashina">{entry.carNumber}</td>
                          <td data-label="To'la">
                            {formatWeight(entry.grossWeight)}
                          </td>
                          <td data-label="Yuksiz">
                            {formatWeight(entry.emptyWeight)}
                          </td>
                          <td data-label="Yuk">
                            {formatWeight(entry.cargoWeight)}
                          </td>
                          <td data-label="Skidka">
                            {formatWeight(entry.discountWeight)}
                          </td>
                          <td className="net-cell" data-label="Qolgan">
                            {formatWeight(entry.netWeight)}
                          </td>
                          <td className="price-cell" data-label="Narx">
                            {formatMoney(entry.pricePerKg)}
                          </td>
                          <td data-label="Summa">
                            {formatMoney(entry.totalAmount)} so'm
                          </td>
                          <td data-label="Amal">
                            <div className="table-actions">
                              <button
                                className="edit-button"
                                type="button"
                                onClick={() => handleEditCargo(entry)}
                              >
                                Edit
                              </button>
                              <button
                                className="delete-button"
                                type="button"
                                onClick={() => handleDeleteCargo(entry.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10">Hali yuk topshirish yozilmagan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export default App
