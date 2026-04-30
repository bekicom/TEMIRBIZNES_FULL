import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

const emptyCargoForm = {
  date: '',
  carId: '',
  clientId: '',
  factoryId: '',
  grossWeight: '',
  emptyWeight: '',
  discountWeight: '',
  transportCost: '',
  pricePerKg: '',
  clientPricePerKg: '',
  clientWeightMode: 'cargo',
}

const getTodayDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const parseNumber = (value) =>
  Number(String(value).replace(/\s/g, '').replace(',', '.')) || 0

const formatNumberInput = (value) => {
  const digits = value.replace(/\D/g, '')

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const formatWeight = (value) =>
  Number(value.toFixed(1)).toLocaleString('ru-RU').replace('.', ',')

const formatMoney = (value) =>
  Math.round(value).toLocaleString('ru-RU')

const formatMoneyText = (value) => `${formatMoney(value)} so'm`

const formatWeightText = (value) => `${formatWeight(value)} kg`

const isWithinDateRange = (date, from, to) => {
  const afterFrom = from ? date >= from : true
  const beforeTo = to ? date <= to : true

  return afterFrom && beforeTo
}

const normalizeClientKey = (client) =>
  `${String(client?.name || '').trim().toLowerCase()}::${String(client?.phone || '')
    .trim()
    .toLowerCase()}`

const normalizeFactoryKey = (factory) =>
  String(factory?.name || '').trim().toLowerCase()

const autosizeWorksheetColumns = (worksheet, rows) => {
  const widths = rows.reduce((result, row) => {
    row.forEach((cell, index) => {
      const valueLength = String(cell ?? '').length
      result[index] = Math.max(result[index] || 10, Math.min(valueLength + 2, 28))
    })

    return result
  }, [])

  worksheet['!cols'] = widths.map((width) => ({ wch: width }))
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'https://temirbiznes-api.vercel.app')

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Server bilan aloqa xatosi')
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('temir_user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [login, setLogin] = useState('admin')
  const [password, setPassword] = useState('0000')
  const [error, setError] = useState('')
  const [dataError, setDataError] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [activePage, setActivePage] = useState('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [carNumber, setCarNumber] = useState('')
  const [cars, setCars] = useState([])
  const [editingCarId, setEditingCarId] = useState(null)
  const [editingNumber, setEditingNumber] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientOpeningPayable, setClientOpeningPayable] = useState('')
  const [clientOpeningReceivable, setClientOpeningReceivable] = useState('')
  const [clients, setClients] = useState([])
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [clientDetailModalOpen, setClientDetailModalOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [editingClientId, setEditingClientId] = useState(null)
  const [editingClientName, setEditingClientName] = useState('')
  const [editingClientPhone, setEditingClientPhone] = useState('')
  const [editingClientOpeningPayable, setEditingClientOpeningPayable] = useState('')
  const [editingClientOpeningReceivable, setEditingClientOpeningReceivable] = useState('')
  const [clientFilters, setClientFilters] = useState({
    from: '',
    to: '',
  })
  const [clientPayments, setClientPayments] = useState([])
  const [clientPaymentDate, setClientPaymentDate] = useState(getTodayDate())
  const [clientPaymentAmount, setClientPaymentAmount] = useState('')
  const [clientPaymentNote, setClientPaymentNote] = useState('')
  const [clientPaymentError, setClientPaymentError] = useState('')
  const [factoryName, setFactoryName] = useState('')
  const [factoryOpeningPayable, setFactoryOpeningPayable] = useState('')
  const [factoryOpeningReceivable, setFactoryOpeningReceivable] = useState('')
  const [factories, setFactories] = useState([])
  const [factoryModalOpen, setFactoryModalOpen] = useState(false)
  const [factoryDetailModalOpen, setFactoryDetailModalOpen] = useState(false)
  const [selectedFactoryId, setSelectedFactoryId] = useState('')
  const [editingFactoryId, setEditingFactoryId] = useState(null)
  const [editingFactoryName, setEditingFactoryName] = useState('')
  const [editingFactoryOpeningPayable, setEditingFactoryOpeningPayable] = useState('')
  const [editingFactoryOpeningReceivable, setEditingFactoryOpeningReceivable] = useState('')
  const [factoryFilters, setFactoryFilters] = useState({
    from: '',
    to: '',
  })
  const [factoryPayments, setFactoryPayments] = useState([])
  const [factoryPaymentDate, setFactoryPaymentDate] = useState(getTodayDate())
  const [factoryPaymentUsd, setFactoryPaymentUsd] = useState('')
  const [factoryPaymentRate, setFactoryPaymentRate] = useState('')
  const [factoryPaymentAmount, setFactoryPaymentAmount] = useState('')
  const [factoryPaymentNote, setFactoryPaymentNote] = useState('')
  const [factoryPaymentError, setFactoryPaymentError] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseReason, setExpenseReason] = useState('')
  const [expenseError, setExpenseError] = useState('')
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [dailyExpenses, setDailyExpenses] = useState([])
  const [dailyExpenseInput, setDailyExpenseInput] = useState('')
  const [dailyExpenseEditing, setDailyExpenseEditing] = useState(false)
  const [dailyExpenseSaving, setDailyExpenseSaving] = useState(false)
  const [dailyExpenseError, setDailyExpenseError] = useState('')
  const [cargoForm, setCargoForm] = useState(emptyCargoForm)
  const [cargoEntries, setCargoEntries] = useState([])
  const [editingCargoId, setEditingCargoId] = useState(null)
  const [cargoError, setCargoError] = useState('')
  const [dashboardFilters, setDashboardFilters] = useState({
    from: '',
    to: '',
  })

  const grossWeight = parseNumber(cargoForm.grossWeight)
  const emptyWeight = parseNumber(cargoForm.emptyWeight)
  const cargoWeight = Math.max(grossWeight - emptyWeight, 0)
  const discountWeight = parseNumber(cargoForm.discountWeight)
  const netWeight = Math.max(cargoWeight - discountWeight, 0)
  const transportCost = parseNumber(cargoForm.transportCost)
  const pricePerKg = parseNumber(cargoForm.pricePerKg)
  const totalAmount = netWeight * pricePerKg
  const clientPricePerKg = parseNumber(cargoForm.clientPricePerKg)
  const clientWeightMode = cargoForm.clientWeightMode || 'cargo'
  const clientPayWeight = clientWeightMode === 'net' ? netWeight : cargoWeight
  const clientTotalAmount = clientPayWeight * clientPricePerKg
  const profitAmount = totalAmount - clientTotalAmount - transportCost
  const todayDate = getTodayDate()
  const hasDateFilter = Boolean(dashboardFilters.from || dashboardFilters.to)
  const latestCargoDate = cargoEntries.reduce(
    (latestDate, entry) => (entry.date > latestDate ? entry.date : latestDate),
    '',
  )
  const defaultSummaryDate = cargoEntries.some((entry) => entry.date === todayDate)
    ? todayDate
    : latestCargoDate
  const singleFilteredDate =
    dashboardFilters.from &&
    dashboardFilters.to &&
    dashboardFilters.from === dashboardFilters.to
      ? dashboardFilters.from
      : ''
  const summaryDate = singleFilteredDate || defaultSummaryDate
  const defaultSummaryCargoEntries = cargoEntries.filter(
    (entry) => entry.date === defaultSummaryDate,
  )
  const filteredCargoEntries = cargoEntries.filter((entry) => {
    const afterFrom = dashboardFilters.from
      ? entry.date >= dashboardFilters.from
      : true
    const beforeTo = dashboardFilters.to ? entry.date <= dashboardFilters.to : true

    return afterFrom && beforeTo
  })
  const filteredExpenses = expenses.filter((expense) => {
    if (!expense.date) {
      return !dashboardFilters.from && !dashboardFilters.to
    }

    const afterFrom = dashboardFilters.from
      ? expense.date >= dashboardFilters.from
      : true
    const beforeTo = dashboardFilters.to
      ? expense.date <= dashboardFilters.to
      : true

    return afterFrom && beforeTo
  })
  const filteredDailyExpenses = dailyExpenses.filter((expense) => {
    if (!expense.date) {
      return !dashboardFilters.from && !dashboardFilters.to
    }

    const afterFrom = dashboardFilters.from
      ? expense.date >= dashboardFilters.from
      : true
    const beforeTo = dashboardFilters.to
      ? expense.date <= dashboardFilters.to
      : true

    return afterFrom && beforeTo
  })
  const displayedCargoEntries = hasDateFilter ? filteredCargoEntries : cargoEntries
  const summaryCargoEntries = hasDateFilter
    ? filteredCargoEntries
    : defaultSummaryCargoEntries
  const summaryTotalKg = summaryCargoEntries.reduce(
    (sum, entry) => sum + entry.netWeight,
    0,
  )
  const summaryTotalAmount = summaryCargoEntries.reduce(
    (sum, entry) => sum + entry.totalAmount,
    0,
  )
  const summaryProfitAmount = summaryCargoEntries.reduce(
    (sum, entry) => sum + (entry.profitAmount || 0),
    0,
  )
  const summaryDailyExpense = hasDateFilter
    ? filteredDailyExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    : dailyExpenses.find((expense) => expense.date === summaryDate)?.amount || 0
  const summaryNetProfitAmount = summaryProfitAmount - summaryDailyExpense
  const summaryIsToday = !hasDateFilter && summaryDate === todayDate
  const summaryKgLabel = summaryIsToday
    ? 'Bugun qabul qilingan jami kg'
    : hasDateFilter
      ? 'Tanlangan oraliq jami kg'
      : "Oxirgi sanadagi jami kg"
  const summaryAmountLabel = summaryIsToday
    ? 'Zavod bugun bergan pul'
    : hasDateFilter
      ? "Tanlangan oraliq zavod puli"
      : "Oxirgi sanadagi zavod puli"
  const summaryProfitLabel = summaryIsToday
    ? 'Bugungi foyda'
    : hasDateFilter
      ? 'Tanlangan oraliq foyda'
      : "Oxirgi sanadagi foyda"
  const dashboardSummaryMoneyLabel = summaryIsToday
    ? 'Bugungi tushum'
    : "Oxirgi sanadagi tushum"
  const dashboardSummaryKgLabel = summaryIsToday
    ? 'Bugungi sof kg'
    : "Oxirgi sanadagi sof kg"
  const totalNetKg = filteredCargoEntries.reduce(
    (sum, entry) => sum + entry.netWeight,
    0,
  )
  const totalAmountAll = filteredCargoEntries.reduce(
    (sum, entry) => sum + entry.totalAmount,
    0,
  )
  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  )
  const totalDailyExpenses = filteredDailyExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  )
  const totalCargoProfit = filteredCargoEntries.reduce(
    (sum, entry) => sum + (entry.profitAmount || 0),
    0,
  )
  const netProfit = totalCargoProfit - totalDailyExpenses - totalExpenses
  const canEditDailyExpense = Boolean(summaryDate && (!hasDateFilter || singleFilteredDate))
  const totalCargoWeight = filteredCargoEntries.reduce(
    (sum, entry) => sum + entry.cargoWeight,
    0,
  )
  const averagePrice = totalNetKg ? totalAmountAll / totalNetKg : 0
  const filteredClientCargoEntries = cargoEntries.filter((entry) =>
    isWithinDateRange(entry.date, clientFilters.from, clientFilters.to),
  )
  const filteredClientPaymentEntries = clientPayments.filter((payment) =>
    isWithinDateRange(payment.date, clientFilters.from, clientFilters.to),
  )
  const previousClientCargoEntries = cargoEntries.filter((entry) =>
    clientFilters.from ? entry.date < clientFilters.from : false,
  )
  const previousClientPaymentEntries = clientPayments.filter((payment) =>
    clientFilters.from ? payment.date < clientFilters.from : false,
  )
  const clientObligationRows = filteredClientCargoEntries.reduce((map, entry) => {
    const key = `${entry.date}::${entry.clientId || entry.clientName}`
    const currentRow = map.get(key) || {
      key,
      date: entry.date,
      clientId: entry.clientId || '',
      clientName: entry.clientName || '-',
      clientPhone:
        clients.find((client) => client.id === entry.clientId)?.phone || '',
      deliveries: 0,
      payWeight: 0,
      clientPaymentAmount: 0,
      factoryAmount: 0,
      profitAmount: 0,
    }

    currentRow.deliveries += 1
    currentRow.payWeight += entry.clientPayWeight || entry.cargoWeight || 0
    currentRow.clientPaymentAmount += entry.clientTotalAmount || 0
    currentRow.factoryAmount += entry.totalAmount || 0
    currentRow.profitAmount += entry.profitAmount || 0

    map.set(key, currentRow)
    return map
  }, new Map())
  const clientObligationByDateRows = [...clientObligationRows.values()].sort((first, second) => {
    if (first.date === second.date) {
      return second.clientPaymentAmount - first.clientPaymentAmount
    }

    return first.date < second.date ? 1 : -1
  })
  const clientGroups = clients.reduce((map, client) => {
    const key = normalizeClientKey(client)
    const currentGroup = map.get(key) || []
    currentGroup.push(client)
    map.set(key, currentGroup)
    return map
  }, new Map())
  const clientSummaryRows = [...clientGroups.values()]
    .map((groupClients) => {
      const groupIds = groupClients.map((client) => client.id)
      const primaryClient = groupClients[0]
      const clientCargoEntries = filteredClientCargoEntries.filter((entry) =>
        groupIds.includes(entry.clientId),
      )
      const clientPaymentItems = filteredClientPaymentEntries.filter((payment) =>
        groupIds.includes(payment.clientId),
      )
      const previousCargoItems = previousClientCargoEntries.filter((entry) =>
        groupIds.includes(entry.clientId),
      )
      const previousPaymentItems = previousClientPaymentEntries.filter((payment) =>
        groupIds.includes(payment.clientId),
      )
      const periodObligationAmount = clientCargoEntries.reduce(
        (sum, entry) => sum + (entry.clientTotalAmount || 0),
        0,
      )
      const openingPayable = groupClients.reduce(
        (sum, client) => sum + (client.openingPayable || 0),
        0,
      )
      const openingReceivable = groupClients.reduce(
        (sum, client) => sum + (client.openingReceivable || 0),
        0,
      )
      const previousObligationAmount = previousCargoItems.reduce(
        (sum, entry) => sum + (entry.clientTotalAmount || 0),
        0,
      )
      const payWeight = clientCargoEntries.reduce(
        (sum, entry) => sum + (entry.clientPayWeight || entry.cargoWeight || 0),
        0,
      )
      const deliveries = clientCargoEntries.length
      const previousPaidAmount = previousPaymentItems.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      )
      const periodPaidAmount = clientPaymentItems.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      )
      const openingBalance =
        openingPayable -
        openingReceivable +
        previousObligationAmount -
        previousPaidAmount
      const remainingDebt = openingBalance + periodObligationAmount - periodPaidAmount

      return {
        client: primaryClient,
        groupIds,
        deliveries,
        payWeight,
        obligationAmount: periodObligationAmount,
        openingPayable,
        openingReceivable,
        openingBalance,
        paidAmount: periodPaidAmount,
        remainingDebt,
      }
    })
    .filter(
      (row) =>
        row.deliveries > 0 ||
        row.paidAmount > 0 ||
        row.obligationAmount > 0 ||
        row.openingBalance !== 0 ||
        row.openingPayable > 0 ||
        row.openingReceivable > 0,
    )
    .sort((first, second) => second.remainingDebt - first.remainingDebt)
  const totalClientPaymentAmount = clientSummaryRows.reduce(
    (sum, row) => sum + row.obligationAmount,
    0,
  )
  const totalClientPaidAmount = clientSummaryRows.reduce(
    (sum, row) => sum + row.paidAmount,
    0,
  )
  const totalClientRemainingDebt = clientSummaryRows.reduce(
    (sum, row) => sum + row.remainingDebt,
    0,
  )
  const totalClientPaymentWeight = clientSummaryRows.reduce(
    (sum, row) => sum + row.payWeight,
    0,
  )
  const selectedClient = clients.find((client) => client.id === selectedClientId) || null
  const selectedClientGroupIds = selectedClient
    ? (clientGroups.get(normalizeClientKey(selectedClient)) || [selectedClient]).map(
        (client) => client.id,
      )
    : []
  const selectedClientCargoEntries = filteredClientCargoEntries.filter((entry) =>
    selectedClientGroupIds.includes(entry.clientId),
  )
  const selectedClientPreviousCargoEntries = previousClientCargoEntries.filter((entry) =>
    selectedClientGroupIds.includes(entry.clientId),
  )
  const selectedClientPaymentHistory = clientPayments
    .filter(
      (payment) =>
        selectedClientGroupIds.includes(payment.clientId) &&
        isWithinDateRange(payment.date, clientFilters.from, clientFilters.to),
    )
    .sort((first, second) => (first.date < second.date ? 1 : -1))
  const selectedClientPreviousPaymentHistory = previousClientPaymentEntries.filter(
    (payment) => selectedClientGroupIds.includes(payment.clientId),
  )
  const selectedClientObligationRows = selectedClientCargoEntries
    .reduce((map, entry) => {
      const key = entry.date
      const currentRow = map.get(key) || {
        date: entry.date,
        deliveries: 0,
        cargoWeight: 0,
        payWeight: 0,
        obligationAmount: 0,
      }

      currentRow.deliveries += 1
      currentRow.cargoWeight += entry.cargoWeight || 0
      currentRow.payWeight += entry.clientPayWeight || entry.cargoWeight || 0
      currentRow.obligationAmount += entry.clientTotalAmount || 0
      map.set(key, currentRow)
      return map
    }, new Map())
    .values()
  const selectedClientObligationList = [...selectedClientObligationRows].sort((first, second) =>
    first.date < second.date ? 1 : -1,
  )
  const selectedClientObligationAmount = selectedClientObligationList.reduce(
    (sum, row) => sum + row.obligationAmount,
    0,
  )
  const selectedClientOpeningPayable = selectedClientGroupIds.length
    ? clients
        .filter((client) => selectedClientGroupIds.includes(client.id))
        .reduce((sum, client) => sum + (client.openingPayable || 0), 0)
    : 0
  const selectedClientOpeningReceivable = selectedClientGroupIds.length
    ? clients
        .filter((client) => selectedClientGroupIds.includes(client.id))
        .reduce((sum, client) => sum + (client.openingReceivable || 0), 0)
    : 0
  const selectedClientPreviousObligationAmount = selectedClientPreviousCargoEntries.reduce(
    (sum, row) => sum + (row.clientTotalAmount || 0),
    0,
  )
  const selectedClientPreviousPaidCarry = selectedClientPreviousPaymentHistory.reduce(
    (sum, row) => sum + (row.amount || 0),
    0,
  )
  const selectedClientOpeningBalance =
    selectedClientOpeningPayable -
    selectedClientOpeningReceivable +
    selectedClientPreviousObligationAmount -
    selectedClientPreviousPaidCarry
  const selectedClientPaidAmount = selectedClientPaymentHistory.reduce(
    (sum, row) => sum + (row.amount || 0),
    0,
  )
  const selectedClientRemainingDebt =
    selectedClientOpeningBalance +
    selectedClientObligationAmount -
    selectedClientPaidAmount
  const filteredFactoryCargoEntries = cargoEntries.filter((entry) =>
    isWithinDateRange(entry.date, factoryFilters.from, factoryFilters.to),
  )
  const filteredFactoryPaymentEntries = factoryPayments.filter((payment) =>
    isWithinDateRange(payment.date, factoryFilters.from, factoryFilters.to),
  )
  const previousFactoryCargoEntries = cargoEntries.filter((entry) =>
    factoryFilters.from ? entry.date < factoryFilters.from : false,
  )
  const previousFactoryPaymentEntries = factoryPayments.filter((payment) =>
    factoryFilters.from ? payment.date < factoryFilters.from : false,
  )
  const factoryGroups = factories.reduce((map, factory) => {
    const key = normalizeFactoryKey(factory)
    const currentGroup = map.get(key) || []
    currentGroup.push(factory)
    map.set(key, currentGroup)
    return map
  }, new Map())
  const factorySummaryRows = [...factoryGroups.values()]
    .map((groupFactories) => {
      const groupIds = groupFactories.map((factory) => factory.id)
      const primaryFactory = groupFactories[0]
      const factoryCargoEntries = filteredFactoryCargoEntries.filter((entry) =>
        groupIds.includes(entry.factoryId),
      )
      const factoryPaymentItems = filteredFactoryPaymentEntries.filter((payment) =>
        groupIds.includes(payment.factoryId),
      )
      const previousCargoItems = previousFactoryCargoEntries.filter((entry) =>
        groupIds.includes(entry.factoryId),
      )
      const previousPaymentItems = previousFactoryPaymentEntries.filter((payment) =>
        groupIds.includes(payment.factoryId),
      )
      const periodObligationAmount = factoryCargoEntries.reduce(
        (sum, entry) => sum + (entry.totalAmount || 0),
        0,
      )
      const openingPayable = groupFactories.reduce(
        (sum, factory) => sum + (factory.openingPayable || 0),
        0,
      )
      const openingReceivable = groupFactories.reduce(
        (sum, factory) => sum + (factory.openingReceivable || 0),
        0,
      )
      const previousObligationAmount = previousCargoItems.reduce(
        (sum, entry) => sum + (entry.totalAmount || 0),
        0,
      )
      const netWeight = factoryCargoEntries.reduce(
        (sum, entry) => sum + (entry.netWeight || 0),
        0,
      )
      const deliveries = factoryCargoEntries.length
      const previousPaidAmount = previousPaymentItems.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      )
      const periodPaidAmount = factoryPaymentItems.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      )
      const openingBalance =
        openingPayable -
        openingReceivable +
        previousObligationAmount -
        previousPaidAmount
      const remainingDebt = openingBalance + periodObligationAmount - periodPaidAmount

      return {
        factory: primaryFactory,
        groupIds,
        deliveries,
        netWeight,
        obligationAmount: periodObligationAmount,
        openingPayable,
        openingReceivable,
        openingBalance,
        paidAmount: periodPaidAmount,
        remainingDebt,
      }
    })
    .filter(
      (row) =>
        row.deliveries > 0 ||
        row.paidAmount > 0 ||
        row.obligationAmount > 0 ||
        row.openingBalance !== 0 ||
        row.openingPayable > 0 ||
        row.openingReceivable > 0,
    )
    .sort((first, second) => second.remainingDebt - first.remainingDebt)
  const totalFactoryObligationAmount = factorySummaryRows.reduce(
    (sum, row) => sum + row.obligationAmount,
    0,
  )
  const totalFactoryPaidAmount = factorySummaryRows.reduce(
    (sum, row) => sum + row.paidAmount,
    0,
  )
  const totalFactoryRemainingDebt = factorySummaryRows.reduce(
    (sum, row) => sum + row.remainingDebt,
    0,
  )
  const totalFactoryNetWeight = factorySummaryRows.reduce(
    (sum, row) => sum + row.netWeight,
    0,
  )
  const selectedFactory =
    factories.find((factory) => factory.id === selectedFactoryId) || null
  const selectedFactoryGroupIds = selectedFactory
    ? (factoryGroups.get(normalizeFactoryKey(selectedFactory)) || [selectedFactory]).map(
        (factory) => factory.id,
      )
    : []
  const selectedFactoryCargoEntries = filteredFactoryCargoEntries
    .filter((entry) => selectedFactoryGroupIds.includes(entry.factoryId))
    .sort((first, second) => {
      if (first.date === second.date) {
        return second.totalAmount - first.totalAmount
      }

      return first.date < second.date ? 1 : -1
    })
  const selectedFactoryPreviousCargoEntries = previousFactoryCargoEntries.filter((entry) =>
    selectedFactoryGroupIds.includes(entry.factoryId),
  )
  const selectedFactoryPaymentHistory = factoryPayments
    .filter(
      (payment) =>
        selectedFactoryGroupIds.includes(payment.factoryId) &&
        isWithinDateRange(payment.date, factoryFilters.from, factoryFilters.to),
    )
    .sort((first, second) => (first.date < second.date ? 1 : -1))
  const selectedFactoryPreviousPaymentHistory = previousFactoryPaymentEntries.filter(
    (payment) => selectedFactoryGroupIds.includes(payment.factoryId),
  )
  const selectedFactoryObligationAmount = selectedFactoryCargoEntries.reduce(
    (sum, row) => sum + (row.totalAmount || 0),
    0,
  )
  const selectedFactoryOpeningPayable = selectedFactoryGroupIds.length
    ? factories
        .filter((factory) => selectedFactoryGroupIds.includes(factory.id))
        .reduce((sum, factory) => sum + (factory.openingPayable || 0), 0)
    : 0
  const selectedFactoryOpeningReceivable = selectedFactoryGroupIds.length
    ? factories
        .filter((factory) => selectedFactoryGroupIds.includes(factory.id))
        .reduce((sum, factory) => sum + (factory.openingReceivable || 0), 0)
    : 0
  const selectedFactoryPreviousObligationAmount = selectedFactoryPreviousCargoEntries.reduce(
    (sum, row) => sum + (row.totalAmount || 0),
    0,
  )
  const selectedFactoryPreviousPaidCarry = selectedFactoryPreviousPaymentHistory.reduce(
    (sum, row) => sum + (row.amount || 0),
    0,
  )
  const selectedFactoryOpeningBalance =
    selectedFactoryOpeningPayable -
    selectedFactoryOpeningReceivable +
    selectedFactoryPreviousObligationAmount -
    selectedFactoryPreviousPaidCarry
  const selectedFactoryPaidAmount = selectedFactoryPaymentHistory.reduce(
    (sum, row) => sum + (row.amount || 0),
    0,
  )
  const selectedFactoryRemainingDebt =
    selectedFactoryOpeningBalance +
    selectedFactoryObligationAmount -
    selectedFactoryPaidAmount
  const factoryPaymentUsdValue = parseNumber(factoryPaymentUsd)
  const factoryPaymentRateValue = parseNumber(factoryPaymentRate)
  const factoryPaymentCalculatedAmount =
    factoryPaymentUsdValue * factoryPaymentRateValue
  const totalClientDebtToUs = clientSummaryRows.reduce(
    (sum, row) => sum + Math.max(-row.remainingDebt, 0),
    0,
  )
  const totalClientDebtFromUs = clientSummaryRows.reduce(
    (sum, row) => sum + Math.max(row.remainingDebt, 0),
    0,
  )
  const dashboardFactoryBalanceRows = factories
    .map((factory) => {
      const factoryCargoEntries = filteredCargoEntries.filter(
        (entry) => entry.factoryId === factory.id,
      )
      const factoryPaymentItems = factoryPayments.filter((payment) => {
        const sameFactory = payment.factoryId === factory.id
        const afterFrom = dashboardFilters.from
          ? payment.date >= dashboardFilters.from
          : true
        const beforeTo = dashboardFilters.to ? payment.date <= dashboardFilters.to : true

        return sameFactory && afterFrom && beforeTo
      })
      const cargoAmount = factoryCargoEntries.reduce(
        (sum, entry) => sum + (entry.totalAmount || 0),
        0,
      )
      const receivedAmount = factoryPaymentItems.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      )
      const receivable = cargoAmount + (factory.openingReceivable || 0)
      const payable = factory.openingPayable || 0
      const netBalance = receivable - receivedAmount - payable

      return {
        factory,
        cargoAmount,
        receivedAmount,
        receivable,
        payable,
        netBalance,
      }
    })
    .filter(
      (row) =>
        row.cargoAmount > 0 ||
        row.receivedAmount > 0 ||
        row.receivable > 0 ||
        row.payable > 0,
    )
    .sort((first, second) => Math.abs(second.netBalance) - Math.abs(first.netBalance))
  const totalFactoryDebtToUs = dashboardFactoryBalanceRows.reduce(
    (sum, row) => sum + Math.max(row.netBalance, 0),
    0,
  )
  const totalFactoryDebtFromUs = dashboardFactoryBalanceRows.reduce(
    (sum, row) => sum + Math.max(-row.netBalance, 0),
    0,
  )
  const totalFactoryReceivedAmount = dashboardFactoryBalanceRows.reduce(
    (sum, row) => sum + row.receivedAmount,
    0,
  )
  const cashOnHand =
    totalFactoryReceivedAmount -
    totalClientPaidAmount -
    totalDailyExpenses -
    totalExpenses
  const realCashProfit = cashOnHand
  const topClientDebtRows = [...clientSummaryRows]
    .filter((row) => row.remainingDebt !== 0)
    .sort((first, second) => Math.abs(second.remainingDebt) - Math.abs(first.remainingDebt))
    .slice(0, 6)
  const topFactoryBalanceRows = dashboardFactoryBalanceRows.slice(0, 6)
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

  const loadData = async () => {
    setDataError('')
    setDataLoading(true)

    try {
      const data = await requestJson('/api/bootstrap')
      setCars(data.cars || [])
      setClients(data.clients || [])
      setFactories(data.factories || [])
      setExpenses(data.expenses || [])
      setDailyExpenses(data.dailyExpenses || [])
      setClientPayments(data.clientPayments || [])
      setFactoryPayments(data.factoryPayments || [])
      setCargoEntries(data.cargoEntries || [])
    } catch (err) {
      setDataError(err.message)
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    localStorage.removeItem('temir_cars')
    localStorage.removeItem('temir_clients')
    localStorage.removeItem('temir_factories')
    localStorage.removeItem('temir_expenses')
    localStorage.removeItem('temir_daily_expenses')
    localStorage.removeItem('temir_cargo_entries')
    loadData()
  }, [])

  useEffect(() => {
    if (!dailyExpenseEditing) {
      setDailyExpenseInput('')
      setDailyExpenseError('')
    }
  }, [summaryDate, summaryDailyExpense])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
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
      setDataError('')
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
    setDataError('')
  }

  const createItem = async (route, payload, setItems) => {
    const item = await requestJson(`/api/${route}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    setItems((items) => [item, ...items])
    setDataError('')
    return item
  }

  const updateItem = async (route, itemId, payload, setItems) => {
    const item = await requestJson(`/api/${route}/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    setItems((items) =>
      items.map((currentItem) => (currentItem.id === itemId ? item : currentItem)),
    )
    setDataError('')
    return item
  }

  const deleteItem = async (route, itemId, setItems) => {
    await requestJson(`/api/${route}/${itemId}`, {
      method: 'DELETE',
    })

    setItems((items) => items.filter((item) => item.id !== itemId))
    setDataError('')
  }

  const handleCreateCar = async (event) => {
    event.preventDefault()

    const number = carNumber.trim().toUpperCase()

    if (!number) {
      return
    }

    try {
      await createItem('cars', { number }, setCars)
      setCarNumber('')
    } catch (err) {
      setDataError(err.message)
    }
  }

  const handleStartEdit = (car) => {
    setEditingCarId(car.id)
    setEditingNumber(car.number)
  }

  const handleCancelEdit = () => {
    setEditingCarId(null)
    setEditingNumber('')
  }

  const handleSaveEdit = async (event) => {
    event.preventDefault()

    const number = editingNumber.trim().toUpperCase()

    if (!number) {
      return
    }

    try {
      await updateItem('cars', editingCarId, { number }, setCars)
      handleCancelEdit()
    } catch (err) {
      setDataError(err.message)
    }
  }

  const handleDeleteCar = async (carId) => {
    try {
      await deleteItem('cars', carId, setCars)
    } catch (err) {
      setDataError(err.message)
      return
    }

    if (editingCarId === carId) {
      handleCancelEdit()
    }
  }

  const handleCreateClient = async (event) => {
    event.preventDefault()

    const name = clientName.trim()
    const phone = clientPhone.trim()
    const openingPayable = parseNumber(clientOpeningPayable)
    const openingReceivable = parseNumber(clientOpeningReceivable)

    if (!name) {
      return
    }

    try {
      await createItem(
        'clients',
        { name, phone, openingPayable, openingReceivable },
        setClients,
      )
      setClientName('')
      setClientPhone('')
      setClientOpeningPayable('')
      setClientOpeningReceivable('')
      setClientModalOpen(false)
    } catch (err) {
      setDataError(err.message)
    }
  }

  const handleStartEditClient = (client) => {
    setEditingClientId(client.id)
    setEditingClientName(client.name)
    setEditingClientPhone(client.phone)
    setEditingClientOpeningPayable(
      client.openingPayable ? formatNumberInput(String(client.openingPayable)) : '',
    )
    setEditingClientOpeningReceivable(
      client.openingReceivable ? formatNumberInput(String(client.openingReceivable)) : '',
    )
  }

  const handleCancelEditClient = () => {
    setEditingClientId(null)
    setEditingClientName('')
    setEditingClientPhone('')
    setEditingClientOpeningPayable('')
    setEditingClientOpeningReceivable('')
  }

  const handleOpenClientDetail = (clientId) => {
    setSelectedClientId(clientId)
    setClientPaymentDate(getTodayDate())
    setClientPaymentAmount('')
    setClientPaymentNote('')
    setClientPaymentError('')
    setClientDetailModalOpen(true)
  }

  const handleCloseClientDetail = () => {
    setClientDetailModalOpen(false)
    setSelectedClientId('')
    setClientPaymentDate(getTodayDate())
    setClientPaymentAmount('')
    setClientPaymentNote('')
    setClientPaymentError('')
  }

  const handleSaveClient = async (event) => {
    event.preventDefault()

    const name = editingClientName.trim()
    const phone = editingClientPhone.trim()
    const openingPayable = parseNumber(editingClientOpeningPayable)
    const openingReceivable = parseNumber(editingClientOpeningReceivable)

    if (!name) {
      return
    }

    try {
      await updateItem(
        'clients',
        editingClientId,
        { name, phone, openingPayable, openingReceivable },
        setClients,
      )
      handleCancelEditClient()
    } catch (err) {
      setDataError(err.message)
    }
  }

  const handleDeleteClient = async (clientId) => {
    try {
      await deleteItem('clients', clientId, setClients)
    } catch (err) {
      setDataError(err.message)
      return
    }

    if (editingClientId === clientId) {
      handleCancelEditClient()
    }
  }

  const handleCreateClientPayment = async (event) => {
    event.preventDefault()

    const amount = parseNumber(clientPaymentAmount)
    const note = clientPaymentNote.trim()

    if (!selectedClientId) {
      setClientPaymentError('Klent tanlanmagan')
      return
    }

    if (!clientPaymentDate) {
      setClientPaymentError('To\'lov sanasini tanlang')
      return
    }

    if (!amount) {
      setClientPaymentError('To\'lov summasini kiriting')
      return
    }

    try {
      await createItem(
        'clientPayments',
        {
          clientId: selectedClientId,
          date: clientPaymentDate,
          amount,
          note,
        },
        setClientPayments,
      )
      setClientPaymentAmount('')
      setClientPaymentNote('')
      setClientPaymentError('')
    } catch (err) {
      setClientPaymentError(err.message)
    }
  }

  const handleCreateFactory = async (event) => {
    event.preventDefault()

    const name = factoryName.trim()
    const openingPayable = parseNumber(factoryOpeningPayable)
    const openingReceivable = parseNumber(factoryOpeningReceivable)

    if (!name) {
      return
    }

    try {
      await createItem(
        'factories',
        { name, openingPayable, openingReceivable },
        setFactories,
      )
      setFactoryName('')
      setFactoryOpeningPayable('')
      setFactoryOpeningReceivable('')
      setFactoryModalOpen(false)
    } catch (err) {
      setDataError(err.message)
    }
  }

  const handleStartEditFactory = (factory) => {
    setEditingFactoryId(factory.id)
    setEditingFactoryName(factory.name)
    setEditingFactoryOpeningPayable(
      factory.openingPayable ? formatNumberInput(String(factory.openingPayable)) : '',
    )
    setEditingFactoryOpeningReceivable(
      factory.openingReceivable ? formatNumberInput(String(factory.openingReceivable)) : '',
    )
  }

  const handleCancelEditFactory = () => {
    setEditingFactoryId(null)
    setEditingFactoryName('')
    setEditingFactoryOpeningPayable('')
    setEditingFactoryOpeningReceivable('')
  }

  const handleOpenFactoryDetail = (factoryId) => {
    setSelectedFactoryId(factoryId)
    setFactoryPaymentDate(getTodayDate())
    setFactoryPaymentUsd('')
    setFactoryPaymentRate('')
    setFactoryPaymentAmount('')
    setFactoryPaymentNote('')
    setFactoryPaymentError('')
    setFactoryDetailModalOpen(true)
  }

  const handleCloseFactoryDetail = () => {
    setFactoryDetailModalOpen(false)
    setSelectedFactoryId('')
    setFactoryPaymentDate(getTodayDate())
    setFactoryPaymentUsd('')
    setFactoryPaymentRate('')
    setFactoryPaymentAmount('')
    setFactoryPaymentNote('')
    setFactoryPaymentError('')
  }

  const handleSaveFactory = async (event) => {
    event.preventDefault()

    const name = editingFactoryName.trim()
    const openingPayable = parseNumber(editingFactoryOpeningPayable)
    const openingReceivable = parseNumber(editingFactoryOpeningReceivable)

    if (!name) {
      return
    }

    try {
      await updateItem(
        'factories',
        editingFactoryId,
        { name, openingPayable, openingReceivable },
        setFactories,
      )
      handleCancelEditFactory()
    } catch (err) {
      setDataError(err.message)
    }
  }

  const handleDeleteFactory = async (factoryId) => {
    try {
      await deleteItem('factories', factoryId, setFactories)
    } catch (err) {
      setDataError(err.message)
      return
    }

    if (editingFactoryId === factoryId) {
      handleCancelEditFactory()
    }
  }

  const handleCreateFactoryPayment = async (event) => {
    event.preventDefault()

    const usdAmount = parseNumber(factoryPaymentUsd)
    const exchangeRate = parseNumber(factoryPaymentRate)
    const amount = usdAmount * exchangeRate
    const note = factoryPaymentNote.trim()

    if (!selectedFactoryId) {
      setFactoryPaymentError('Zavod tanlanmagan')
      return
    }

    if (!factoryPaymentDate) {
      setFactoryPaymentError('To\'lov sanasini tanlang')
      return
    }

    if (!usdAmount) {
      setFactoryPaymentError('USD summani kiriting')
      return
    }

    if (!exchangeRate) {
      setFactoryPaymentError('Kursni kiriting')
      return
    }

    if (!amount) {
      setFactoryPaymentError('So\'m summasi hisoblanmadi')
      return
    }

    try {
      await createItem(
        'factoryPayments',
        {
          factoryId: selectedFactoryId,
          date: factoryPaymentDate,
          amount,
          usdAmount,
          exchangeRate,
          note,
        },
        setFactoryPayments,
      )
      setFactoryPaymentUsd('')
      setFactoryPaymentRate('')
      setFactoryPaymentAmount('')
      setFactoryPaymentNote('')
      setFactoryPaymentError('')
    } catch (err) {
      setFactoryPaymentError(err.message)
    }
  }

  const handleCreateExpense = async (event) => {
    event.preventDefault()

    const amount = parseNumber(expenseAmount)
    const reason = expenseReason.trim()

    if (!expenseDate) {
      setExpenseError('Xarajat sanasini tanlang')
      return
    }

    if (!amount) {
      setExpenseError('Xarajat summasini raqamda kiriting')
      return
    }

    if (!reason) {
      setExpenseError('Xarajat sababini kiriting')
      return
    }

    const expensePayload = {
      date: expenseDate,
      amount,
      reason,
    }

    try {
      if (editingExpenseId) {
        await updateItem('expenses', editingExpenseId, expensePayload, setExpenses)
      } else {
        await createItem('expenses', expensePayload, setExpenses)
      }

      setExpenseDate('')
      setExpenseAmount('')
      setExpenseReason('')
      setExpenseError('')
      setEditingExpenseId(null)
      setExpenseModalOpen(false)
    } catch (err) {
      setExpenseError(err.message)
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    try {
      await deleteItem('expenses', expenseId, setExpenses)
    } catch (err) {
      setDataError(err.message)
      return
    }

    if (editingExpenseId === expenseId) {
      setEditingExpenseId(null)
      setExpenseDate('')
      setExpenseAmount('')
      setExpenseReason('')
      setExpenseError('')
      setExpenseModalOpen(false)
    }
  }

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id)
    setExpenseDate(expense.date || '')
    setExpenseAmount(formatNumberInput(String(expense.amount)))
    setExpenseReason(expense.reason)
    setExpenseError('')
    setExpenseModalOpen(true)
  }

  const handleCloseExpenseModal = () => {
    setExpenseModalOpen(false)
    setEditingExpenseId(null)
    setExpenseDate('')
    setExpenseAmount('')
    setExpenseReason('')
    setExpenseError('')
  }

  const saveDailyExpense = async () => {
    if (!summaryDate || dailyExpenseSaving) {
      return
    }

    const amount = parseNumber(dailyExpenseInput)
    const existingExpense = dailyExpenses.find(
      (expense) => expense.date === summaryDate,
    )

    if (!amount && !existingExpense) {
      setDailyExpenseInput('')
      return
    }

    setDailyExpenseSaving(true)
    setDailyExpenseError('')

    try {
      if (existingExpense) {
        if (!amount) {
          await deleteItem('dailyExpenses', existingExpense.id, setDailyExpenses)
          setDailyExpenseInput('')
        } else {
          await updateItem(
            'dailyExpenses',
            existingExpense.id,
            { date: summaryDate, amount },
            setDailyExpenses,
          )
          setDailyExpenseInput('')
        }
      } else {
        await createItem(
          'dailyExpenses',
          { date: summaryDate, amount },
          setDailyExpenses,
        )
        setDailyExpenseInput('')
      }
      setDailyExpenseEditing(false)
    } catch (err) {
      setDailyExpenseError(err.message)
    } finally {
      setDailyExpenseSaving(false)
    }
  }

  const updateCargoField = (field, value) => {
    setCargoError('')
    setCargoForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const resetCargoForm = () => {
    setCargoForm(emptyCargoForm)
    setEditingCargoId(null)
    setCargoError('')
  }

  const handleSaveCargo = async (event) => {
    event.preventDefault()

    const selectedCar = cars.find((car) => car.id === cargoForm.carId)
    const selectedClient = clients.find((client) => client.id === cargoForm.clientId)
    const selectedFactory = factories.find(
      (factory) => factory.id === cargoForm.factoryId,
    )

    if (!cargoForm.date) {
      setCargoError('Sanani tanlang')
      return
    }

    if (!selectedCar) {
      setCargoError('Mashinani tanlang')
      return
    }

    if (!selectedClient) {
      setCargoError('Klentni tanlang')
      return
    }

    if (!selectedFactory) {
      setCargoError('Zavodni tanlang')
      return
    }

    if (!grossWeight) {
      setCargoError("To'la vaznini kiriting")
      return
    }

    if (!pricePerKg) {
      setCargoError('Kilosiga pulni kiriting')
      return
    }

    if (!clientPricePerKg) {
      setCargoError("Klentga to'lov narxini kiriting")
      return
    }

    const cargoEntry = {
      date: cargoForm.date,
      carId: selectedCar.id,
      carNumber: selectedCar.number,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      factoryId: selectedFactory.id,
      factoryName: selectedFactory.name,
      grossWeight,
      emptyWeight,
      cargoWeight,
      discountWeight,
      transportCost,
      netWeight,
      pricePerKg,
      clientWeightMode,
      clientPayWeight,
      clientPricePerKg,
      clientTotalAmount,
      totalAmount,
      profitAmount,
    }

    try {
      if (editingCargoId) {
        await updateItem(
          'cargoEntries',
          editingCargoId,
          cargoEntry,
          setCargoEntries,
        )
      } else {
        await createItem('cargoEntries', cargoEntry, setCargoEntries)
      }

      resetCargoForm()
    } catch (err) {
      setCargoError(err.message)
    }
  }

  const handleEditCargo = (entry) => {
    setEditingCargoId(entry.id)
    setCargoForm({
      date: entry.date,
      carId: entry.carId,
      clientId: entry.clientId || '',
      factoryId: entry.factoryId || '',
      grossWeight: String(entry.grossWeight),
      emptyWeight: String(entry.emptyWeight),
      discountWeight: String(entry.discountWeight),
      transportCost: String(entry.transportCost || ''),
      pricePerKg: String(entry.pricePerKg),
      clientPricePerKg: String(entry.clientPricePerKg || ''),
      clientWeightMode: entry.clientWeightMode || 'cargo',
    })
    setActivePage('cargo-delivery')
  }

  const handleDeleteCargo = async (entryId) => {
    try {
      await deleteItem('cargoEntries', entryId, setCargoEntries)
    } catch (err) {
      setDataError(err.message)
      return
    }

    if (editingCargoId === entryId) {
      resetCargoForm()
    }
  }

  const handleExportCargoToExcel = () => {
    const rows = displayedCargoEntries.map((entry) => ({
      Sana: entry.date,
      Mashina: entry.carNumber,
      Klent: entry.clientName || '',
      Zavod: entry.factoryName || '',
      "To'la vazni": entry.grossWeight,
      'Yuksiz vazni': entry.emptyWeight,
      'Qolgan yuki': entry.cargoWeight,
      Skidka: entry.discountWeight,
      Yolkira: entry.transportCost || 0,
      'Qolgan vazn': entry.netWeight,
      "Klent hisob turi": entry.clientWeightMode === 'net' ? "Qolgan vazn" : "Qolgan yuki",
      "To'lov kg": entry.clientPayWeight || entry.cargoWeight,
      'Kilosiga pul': entry.pricePerKg,
      "Klent narxi": entry.clientPricePerKg || 0,
      "Klentga to'lov": Math.round(entry.clientTotalAmount || 0),
      'Aniq summa': Math.round(entry.totalAmount),
      Foyda: Math.round(entry.profitAmount || 0),
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Yuk topshirish')
    XLSX.writeFile(workbook, 'yuk-topshirish.xlsx')
  }

  const handleExportClientDetailToExcel = () => {
    if (!selectedClient) {
      return
    }

    const workbook = XLSX.utils.book_new()
    let clientRunningBalance = selectedClientOpeningBalance
    const clientLedgerRows = [
      ['Sana', 'Mashina', "To'la", 'Yuksiz', 'Yuk', 'Skidka', "To'lov kg", 'Klent narxi', 'Qarz', "To'lov", 'Izoh', 'Qoldiq'],
      ...(selectedClientOpeningBalance
        ? [[
            clientFilters.from || "Boshlang'ich",
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            "Boshlang'ich qoldiq",
            formatMoneyText(clientRunningBalance),
          ]]
        : []),
    ]

    const clientLedgerItems = [
      ...selectedClientCargoEntries.map((entry) => ({
        type: 'cargo',
        sortDate: entry.date,
        date: entry.date,
        carNumber: entry.carNumber || '',
        grossWeight: entry.grossWeight || 0,
        emptyWeight: entry.emptyWeight || 0,
        cargoWeight: entry.cargoWeight || 0,
        discountWeight: entry.discountWeight || 0,
        payWeight: entry.clientPayWeight || entry.cargoWeight || 0,
        clientPricePerKg: entry.clientPricePerKg || 0,
        debtAmount: entry.clientTotalAmount || 0,
      })),
      ...selectedClientPaymentHistory.map((payment) => ({
        type: 'payment',
        sortDate: payment.date,
        date: payment.date,
        paymentAmount: payment.amount || 0,
        note: payment.note || '-',
      })),
    ].sort((first, second) => {
      if (first.sortDate === second.sortDate) {
        return first.type === second.type ? 0 : first.type === 'cargo' ? -1 : 1
      }

      return first.sortDate < second.sortDate ? -1 : 1
    })

    clientLedgerItems.forEach((item) => {
      if (item.type === 'cargo') {
        clientRunningBalance += item.debtAmount
        clientLedgerRows.push([
          item.date,
          item.carNumber,
          formatMoney(item.grossWeight),
          formatMoney(item.emptyWeight),
          formatMoney(item.cargoWeight),
          formatWeight(item.discountWeight),
          formatWeight(item.payWeight),
          formatMoneyText(item.clientPricePerKg),
          formatMoneyText(item.debtAmount),
          '',
          '',
          formatMoneyText(clientRunningBalance),
        ])
      } else {
        clientRunningBalance -= item.paymentAmount
        clientLedgerRows.push([
          item.date,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          formatMoneyText(item.paymentAmount),
          item.note,
          formatMoneyText(clientRunningBalance),
        ])
      }
    })

    const reportRows = [
      ['KLENT BILAN AKTSVERKA'],
      ['Klent ismi', selectedClient.name],
      ['Telefon raqami', selectedClient.phone || '-'],
      ['Hisobot boshi', clientFilters.from || 'Barcha davr'],
      ['Hisobot oxiri', clientFilters.to || 'Barcha davr'],
      ['Boshlang‘ich qoldiq', formatMoneyText(selectedClientOpeningBalance)],
      ['Shu davrda olingan yuklar summasi', formatMoneyText(selectedClientObligationAmount)],
      ['Shu davrda berilgan pullar', formatMoneyText(selectedClientPaidAmount)],
      ['Davr oxiridagi qoldiq', formatMoneyText(selectedClientRemainingDebt)],
      [],
      ...clientLedgerRows,
    ]
    const summaryRows = [
      {
        Klent: selectedClient.name,
        Telefon: selectedClient.phone || '-',
        "Boshlang'ich saldo": Math.round(selectedClientOpeningBalance),
        "Davr qarz": Math.round(selectedClientObligationAmount),
        "Davr to'lov": Math.round(selectedClientPaidAmount),
        "Yakuniy saldo": Math.round(selectedClientRemainingDebt),
      },
    ]
    const obligationRows = [
      ...(selectedClientOpeningPayable || selectedClientOpeningReceivable
        ? [
            {
              Sana: "Boshlang'ich",
              Topshirish: '-',
              "Yuk kg": '-',
              "To'lov kg": '-',
              Qarz: Math.round(
                selectedClientOpeningBalance,
              ),
            },
          ]
        : []),
      ...selectedClientObligationList.map((row) => ({
        Sana: row.date,
        Topshirish: row.deliveries,
        "Yuk kg": Number(row.cargoWeight.toFixed(1)),
        "To'lov kg": Number(row.payWeight.toFixed(1)),
        Qarz: Math.round(row.obligationAmount),
      })),
    ]
    const paymentRows = selectedClientPaymentHistory.map((row) => ({
      Sana: row.date,
      Summa: Math.round(row.amount || 0),
      Izoh: row.note || '-',
    }))
    const reportSheet = XLSX.utils.aoa_to_sheet(reportRows)

    autosizeWorksheetColumns(reportSheet, reportRows)

    XLSX.utils.book_append_sheet(
      workbook,
      reportSheet,
      'Aktsverka',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryRows),
      'Umumiy',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(obligationRows),
      'Qarz tarixi',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(paymentRows.length ? paymentRows : [{ Sana: '-', Summa: 0, Izoh: '-' }]),
      "To'lovlar",
    )
    XLSX.writeFile(workbook, `${selectedClient.name}-klent-hisoboti.xlsx`)
  }

  const handleExportFactoryDetailToExcel = () => {
    if (!selectedFactory) {
      return
    }

    const workbook = XLSX.utils.book_new()
    let factoryRunningBalance = selectedFactoryOpeningBalance
    const factoryLedgerRows = [
      ['Sana', 'Mashina', "To'la", 'Yuksiz', 'Yuk', 'Skidka', 'Sof kg', 'Narx', 'Qarz', 'USD', 'Kurs', "To'lov", 'Izoh', 'Qoldiq'],
      ...(selectedFactoryOpeningBalance
        ? [[
            factoryFilters.from || "Boshlang'ich",
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            "Boshlang'ich qoldiq",
            formatMoneyText(factoryRunningBalance),
          ]]
        : []),
    ]

    const factoryLedgerItems = [
      ...selectedFactoryCargoEntries.map((entry) => ({
        type: 'cargo',
        sortDate: entry.date,
        date: entry.date,
        carNumber: entry.carNumber || '',
        grossWeight: entry.grossWeight || 0,
        emptyWeight: entry.emptyWeight || 0,
        cargoWeight: entry.cargoWeight || 0,
        discountWeight: entry.discountWeight || 0,
        netWeight: entry.netWeight || 0,
        pricePerKg: entry.pricePerKg || 0,
        debtAmount: entry.totalAmount || 0,
      })),
      ...selectedFactoryPaymentHistory.map((payment) => ({
        type: 'payment',
        sortDate: payment.date,
        date: payment.date,
        usdAmount: payment.usdAmount || 0,
        exchangeRate: payment.exchangeRate || 0,
        paymentAmount: payment.amount || 0,
        note: payment.note || '-',
      })),
    ].sort((first, second) => {
      if (first.sortDate === second.sortDate) {
        return first.type === second.type ? 0 : first.type === 'cargo' ? -1 : 1
      }

      return first.sortDate < second.sortDate ? -1 : 1
    })

    factoryLedgerItems.forEach((item) => {
      if (item.type === 'cargo') {
        factoryRunningBalance += item.debtAmount
        factoryLedgerRows.push([
          item.date,
          item.carNumber,
          formatMoney(item.grossWeight),
          formatMoney(item.emptyWeight),
          formatMoney(item.cargoWeight),
          formatWeight(item.discountWeight),
          formatWeight(item.netWeight),
          formatMoneyText(item.pricePerKg),
          formatMoneyText(item.debtAmount),
          '',
          '',
          '',
          '',
          formatMoneyText(factoryRunningBalance),
        ])
      } else {
        factoryRunningBalance -= item.paymentAmount
        factoryLedgerRows.push([
          item.date,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          item.usdAmount ? `${formatMoney(item.usdAmount)} $` : '',
          item.exchangeRate ? formatMoney(item.exchangeRate) : '',
          formatMoneyText(item.paymentAmount),
          item.note,
          formatMoneyText(factoryRunningBalance),
        ])
      }
    })

    const reportRows = [
      ['ZAVOD BILAN AKTSVERKA'],
      ['Zavod nomi', selectedFactory.name],
      ['Hisobot boshi', factoryFilters.from || 'Barcha davr'],
      ['Hisobot oxiri', factoryFilters.to || 'Barcha davr'],
      ['Boshlang‘ich qoldiq', formatMoneyText(selectedFactoryOpeningBalance)],
      ['Shu davrda topshirilgan yuklar summasi', formatMoneyText(selectedFactoryObligationAmount)],
      ['Shu davrda zavod to‘lagan pul', formatMoneyText(selectedFactoryPaidAmount)],
      ['Davr oxiridagi qoldiq', formatMoneyText(selectedFactoryRemainingDebt)],
      [],
      ...factoryLedgerRows,
    ]
    const summaryRows = [
      {
        Zavod: selectedFactory.name,
        "Boshlang'ich saldo": Math.round(selectedFactoryOpeningBalance),
        "Davr qarz": Math.round(selectedFactoryObligationAmount),
        "Davr to'lov": Math.round(selectedFactoryPaidAmount),
        "Yakuniy saldo": Math.round(selectedFactoryRemainingDebt),
      },
    ]
    const cargoRows = [
      ...(selectedFactoryOpeningPayable || selectedFactoryOpeningReceivable
        ? [
            {
              Sana: "Boshlang'ich",
              Mashina: '-',
              "Sof kg": '-',
              "Bizning pul": Math.round(
                selectedFactoryOpeningBalance,
              ),
            },
          ]
        : []),
      ...selectedFactoryCargoEntries.map((row) => ({
        Sana: row.date,
        Mashina: row.carNumber,
        "Sof kg": Number((row.netWeight || 0).toFixed(1)),
        "Bizning pul": Math.round(row.totalAmount || 0),
      })),
    ]
    const paymentRows = selectedFactoryPaymentHistory.map((row) => ({
      Sana: row.date,
      USD: row.usdAmount || 0,
      Kurs: row.exchangeRate || 0,
      Summa: Math.round(row.amount || 0),
      Izoh: row.note || '-',
    }))
    const reportSheet = XLSX.utils.aoa_to_sheet(reportRows)

    autosizeWorksheetColumns(reportSheet, reportRows)

    XLSX.utils.book_append_sheet(
      workbook,
      reportSheet,
      'Aktsverka',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryRows),
      'Umumiy',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(cargoRows),
      'Yuklar',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        paymentRows.length
          ? paymentRows
          : [{ Sana: '-', USD: 0, Kurs: 0, Summa: 0, Izoh: '-' }],
      ),
      "To'lovlar",
    )
    XLSX.writeFile(workbook, `${selectedFactory.name}-zavod-hisoboti.xlsx`)
  }

  const handleChangePage = (page) => {
    setDataError('')
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
    <main className={`dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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

      <aside
        className={`sidebar ${mobileMenuOpen ? 'open' : ''} ${
          sidebarCollapsed ? 'collapsed' : ''
        }`}
      >
        <div>
          <div className="sidebar-head">
            <p className="brand">TEMIR BIZNES</p>
            <button
              className="sidebar-toggle"
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? '>' : '<'}
            </button>
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
              className={activePage === 'clients' ? 'active' : ''}
              type="button"
              onClick={() => handleChangePage('clients')}
            >
              Klentlar
            </button>
            <button
              className={activePage === 'expenses' ? 'active' : ''}
              type="button"
              onClick={() => handleChangePage('expenses')}
            >
              Xarajatlar
            </button>
            <button
              className={activePage === 'factories' ? 'active' : ''}
              type="button"
              onClick={() => handleChangePage('factories')}
            >
              Zavod
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
        <button
          className={`content-sidebar-toggle ${sidebarCollapsed ? 'visible' : ''}`}
          type="button"
          onClick={() => setSidebarCollapsed(false)}
        >
          {'>'}
        </button>
        <div className="white-page">
          {dataError ? <p className="data-error">{dataError}</p> : null}
          {dataLoading ? <p className="data-loading">Ma'lumotlar yuklanmoqda...</p> : null}

          {activePage === 'home' ? (
            <div className="dashboard-page">
              <div className="dashboard-toolbar">
                <label className="mini-date-field">
                  Dan
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
                <label className="mini-date-field">
                  Gacha
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

              <div className="stat-grid dashboard-stat-grid">
                <div className="stat-card stat-profit-strong">
                  <span>Hisoblangan foyda</span>
                  <strong>{formatMoney(netProfit)} so'm</strong>
                </div>
                <div className="stat-card stat-cashbox">
                  <span>Kassa</span>
                  <strong>{formatMoney(cashOnHand)} so'm</strong>
                </div>
                <div className="stat-card stat-cash">
                  <span>Haqiqiy foyda</span>
                  <strong>{formatMoney(realCashProfit)} so'm</strong>
                </div>
                <div className="stat-card stat-money">
                  <span>Zavoddan tushgan pul</span>
                  <strong>{formatMoney(totalFactoryReceivedAmount)} so'm</strong>
                </div>
                <div className="stat-card stat-factory-debt">
                  <span>Zavod bizga qarzi</span>
                  <strong>{formatMoney(totalFactoryDebtToUs)} so'm</strong>
                </div>
                <div className="stat-card stat-client-paid">
                  <span>Klentlarga to'langan pul</span>
                  <strong>{formatMoney(totalClientPaidAmount)} so'm</strong>
                </div>
                <div className="stat-card stat-client-debt">
                  <span>Klentlarga qarzimiz</span>
                  <strong>{formatMoney(totalClientDebtFromUs)} so'm</strong>
                </div>
                <div className="stat-card stat-kg">
                  <span>Sof kg</span>
                  <strong>{formatWeight(totalNetKg)} kg</strong>
                </div>
                <div className="stat-card stat-count">
                  <span>Topshirishlar</span>
                  <strong>{filteredCargoEntries.length}</strong>
                </div>
                <div className="stat-card stat-expense">
                  <span>Jami xarajat</span>
                  <strong>{formatMoney(totalExpenses + totalDailyExpenses)} so'm</strong>
                </div>
              </div>

              <div className="dashboard-panels">
                <section className="report-panel">
                  <div className="panel-title">
                    <h2>Mashinalar hisoboti</h2>
                    <span>Jami kg va zavod summasi bo'yicha</span>
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
                    <h2>Balans holati</h2>
                    <span>Klent va zavod bo'yicha eng katta qoldiqlar</span>
                  </div>
                  <div className="balance-panel-grid">
                    <div className="balance-group">
                      <div className="balance-group-head">
                        <strong>Klentlar</strong>
                        <span>Bizga va bizdan qolgan summa</span>
                      </div>
                      <div className="balance-list">
                        {topClientDebtRows.length ? (
                          topClientDebtRows.map((row) => (
                            <div className="balance-row" key={row.client.id}>
                              <div>
                                <strong>{row.client.name}</strong>
                                <span>
                                  {row.remainingDebt > 0
                                    ? "Biz klentga qarzmiz"
                                    : 'Klent bizga qarz'}
                                </span>
                              </div>
                              <strong>{formatMoney(Math.abs(row.remainingDebt))} so'm</strong>
                            </div>
                          ))
                        ) : (
                          <p className="empty-text">Klent balans yozuvi yo'q.</p>
                        )}
                      </div>
                    </div>
                    <div className="balance-group">
                      <div className="balance-group-head">
                        <strong>Zavodlar</strong>
                        <span>Bizga va bizdan qolgan summa</span>
                      </div>
                      <div className="balance-list">
                        {topFactoryBalanceRows.length ? (
                          topFactoryBalanceRows.map((row) => (
                            <div className="balance-row" key={row.factory.id}>
                              <div>
                                <strong>{row.factory.name}</strong>
                                <span>
                                  {row.netBalance >= 0
                                    ? 'Zavod bizga qarz'
                                    : 'Biz zavodga qarzmiz'}
                                </span>
                              </div>
                              <strong>{formatMoney(Math.abs(row.netBalance))} so'm</strong>
                            </div>
                          ))
                        ) : (
                          <p className="empty-text">Zavod balans yozuvi yo'q.</p>
                        )}
                      </div>
                    </div>
                    <div className="metric-list compact-metric-list">
                      <div>
                        <span>Jami zavod puli</span>
                        <strong>{formatMoney(totalAmountAll)} so'm</strong>
                      </div>
                      <div>
                        <span>Jami xarajat</span>
                        <strong>{formatMoney(totalExpenses + totalDailyExpenses)} so'm</strong>
                      </div>
                      <div>
                        <span>Klent bizga qarzi</span>
                        <strong>{formatMoney(totalClientDebtToUs)} so'm</strong>
                      </div>
                      <div>
                        <span>Biz zavodga qarzmiz</span>
                        <strong>{formatMoney(totalFactoryDebtFromUs)} so'm</strong>
                      </div>
                      <div>
                        <span>O'rtacha kilo narxi</span>
                        <strong>{formatMoney(averagePrice)} so'm</strong>
                      </div>
                      <div>
                        <span>{summaryAmountLabel}</span>
                        <strong>{formatMoney(summaryTotalAmount)} so'm</strong>
                      </div>
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

          {activePage === 'clients' ? (
            <div className="clients-page">
              <div className="clients-toolbar">
                <div className="clients-title">
                  <h1>Klentlar</h1>
                </div>
                <div className="clients-toolbar-actions">
                  <label className="mini-date-field">
                    Dan
                    <input
                      type="date"
                      value={clientFilters.from}
                      onChange={(event) =>
                        setClientFilters((filters) => ({
                          ...filters,
                          from: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="mini-date-field">
                    Gacha
                    <input
                      type="date"
                      value={clientFilters.to}
                      onChange={(event) =>
                        setClientFilters((filters) => ({
                          ...filters,
                          to: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="clients-add-button"
                    type="button"
                    onClick={() => {
                      setClientName('')
                      setClientPhone('')
                      setClientModalOpen(true)
                    }}
                  >
                    Klent yaratish
                  </button>
                </div>
              </div>

              <div className="client-summary-card">
                <div>
                  <span>Berish kerak</span>
                  <strong>{formatMoney(totalClientPaymentAmount)} so'm</strong>
                </div>
                <div>
                  <span>Berganmiz</span>
                  <strong>{formatMoney(totalClientPaidAmount)} so'm</strong>
                </div>
                <div>
                  <span>Qolgan qarz</span>
                  <strong>{formatMoney(totalClientRemainingDebt)} so'm</strong>
                </div>
                <div>
                  <span>Jami yuk</span>
                  <strong>{formatWeight(totalClientPaymentWeight)} kg</strong>
                </div>
              </div>

              <div className="client-table-wrap">
                <table className="client-table">
                  <thead>
                    <tr>
                      <th>Klent</th>
                      <th>Telefon</th>
                      <th>Jami yuk</th>
                      <th>Berish kerak</th>
                      <th>Berganmiz</th>
                      <th>Qolgan</th>
                      <th>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientSummaryRows.length ? (
                      clientSummaryRows.map((row) => (
                        <tr key={row.client.id}>
                          <td data-label="Klent">{row.client.name}</td>
                          <td data-label="Telefon">{row.client.phone || '-'}</td>
                          <td data-label="Jami yuk">
                            {formatWeight(row.payWeight)} kg / {row.deliveries} ta
                          </td>
                          <td data-label="Berish kerak">
                            {formatMoney(row.obligationAmount)} so'm
                          </td>
                          <td data-label="Berganmiz">
                            {formatMoney(row.paidAmount)} so'm
                          </td>
                          <td data-label="Qolgan">
                            {formatMoney(row.remainingDebt)} so'm
                          </td>
                          <td data-label="Amal">
                            <div className="client-actions">
                              <button
                                className="view-button"
                                type="button"
                                onClick={() => handleOpenClientDetail(row.client.id)}
                              >
                                Ko'rish
                              </button>
                              <button
                                className="edit-button"
                                type="button"
                                onClick={() => {
                                  handleStartEditClient(row.client)
                                  handleOpenClientDetail(row.client.id)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="delete-button"
                                type="button"
                                onClick={() => handleDeleteClient(row.client.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">Tanlangan oraliqda klent ma'lumoti topilmadi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {clientModalOpen ? (
                <div className="modal-backdrop">
                  <form className="client-modal" onSubmit={handleCreateClient}>
                    <div className="modal-head">
                      <h2>Klent yaratish</h2>
                      <button
                        type="button"
                        onClick={() => setClientModalOpen(false)}
                      >
                        Yopish
                      </button>
                    </div>
                    <label>
                      Klent ismi
                      <input
                        value={clientName}
                        onChange={(event) => setClientName(event.target.value)}
                        placeholder="Ismi"
                        aria-label="Klent ismi"
                      />
                    </label>
                    <label>
                      Telefon raqami
                      <input
                        value={clientPhone}
                        onChange={(event) => setClientPhone(event.target.value)}
                        placeholder="Telefon raqami"
                        aria-label="Klent telefon raqami"
                      />
                    </label>
                    <label>
                      Biz unga qarzmiz
                      <input
                        inputMode="numeric"
                        value={clientOpeningPayable}
                        onChange={(event) =>
                          setClientOpeningPayable(
                            formatNumberInput(event.target.value),
                          )
                        }
                        placeholder="Masalan 3 000 000"
                      />
                    </label>
                    <label>
                      U bizga qarz
                      <input
                        inputMode="numeric"
                        value={clientOpeningReceivable}
                        onChange={(event) =>
                          setClientOpeningReceivable(
                            formatNumberInput(event.target.value),
                          )
                        }
                        placeholder="Masalan 1 500 000"
                      />
                    </label>
                    <button type="submit">Yaratish</button>
                  </form>
                </div>
              ) : null}

              {clientDetailModalOpen && selectedClient ? (
                <div className="modal-backdrop">
                  <div className="client-detail-modal">
                    <div className="modal-head">
                      <div>
                        <h2>{selectedClient.name}</h2>
                        <p>{selectedClient.phone || '-'}</p>
                      </div>
                      <div className="modal-head-actions">
                        <button
                          className="view-button"
                          type="button"
                          onClick={handleExportClientDetailToExcel}
                        >
                          Excelga yuklash
                        </button>
                        <button type="button" onClick={handleCloseClientDetail}>
                          Yopish
                        </button>
                      </div>
                    </div>

                    <div className="client-detail-stats">
                      <div>
                        <span>Boshlang'ich saldo</span>
                        <strong>{formatMoney(selectedClientOpeningBalance)} so'm</strong>
                      </div>
                      <div>
                        <span>Davr qarz</span>
                        <strong>{formatMoney(selectedClientObligationAmount)} so'm</strong>
                      </div>
                      <div>
                        <span>Davr to'lov</span>
                        <strong>{formatMoney(selectedClientPaidAmount)} so'm</strong>
                      </div>
                      <div>
                        <span>Yakuniy saldo</span>
                        <strong>{formatMoney(selectedClientRemainingDebt)} so'm</strong>
                      </div>
                    </div>

                    <div className="detail-filter-bar">
                      <label className="mini-date-field">
                        Dan
                        <input
                          type="date"
                          value={clientFilters.from}
                          onChange={(event) =>
                            setClientFilters((filters) => ({
                              ...filters,
                              from: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="mini-date-field">
                        Gacha
                        <input
                          type="date"
                          value={clientFilters.to}
                          onChange={(event) =>
                            setClientFilters((filters) => ({
                              ...filters,
                              to: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>

                    <form className="client-payment-form" onSubmit={handleCreateClientPayment}>
                      <label>
                        Sana
                        <input
                          type="date"
                          value={clientPaymentDate}
                          onChange={(event) => {
                            setClientPaymentError('')
                            setClientPaymentDate(event.target.value)
                          }}
                        />
                      </label>
                      <label>
                        Berilgan pul
                        <input
                          inputMode="numeric"
                          value={clientPaymentAmount}
                          onChange={(event) => {
                            setClientPaymentError('')
                            setClientPaymentAmount(
                              formatNumberInput(event.target.value),
                            )
                          }}
                          placeholder="Berilgan pul"
                        />
                      </label>
                      <label>
                        Izoh
                        <input
                          value={clientPaymentNote}
                          onChange={(event) => {
                            setClientPaymentError('')
                            setClientPaymentNote(event.target.value)
                          }}
                          placeholder="Izoh"
                        />
                      </label>
                      <button type="submit">To'lov qo'shish</button>
                    </form>

                    {clientPaymentError ? (
                      <p className="expense-error">{clientPaymentError}</p>
                    ) : null}

                    <div className="client-detail-grid">
                      <div className="client-detail-panel">
                        <div className="panel-title">
                          <h2>Qachon qancha yuk olgan</h2>
                        </div>
                        <div className="client-table-wrap">
                          <table className="client-table">
                            <thead>
                              <tr>
                                <th>Sana</th>
                                <th>Topshirish</th>
                                <th>Yuk kg</th>
                                <th>To'lov kg</th>
                                <th>Qarz</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedClientOpeningPayable ||
                              selectedClientOpeningReceivable ? (
                                <tr>
                                  <td>Boshlang'ich</td>
                                  <td>-</td>
                                  <td>-</td>
                                  <td>-</td>
                                  <td>
                                    {formatMoney(
                                      selectedClientOpeningBalance,
                                    )}{' '}
                                    so'm
                                  </td>
                                </tr>
                              ) : null}
                              {selectedClientObligationList.length ? (
                                selectedClientObligationList.map((row) => (
                                  <tr key={row.date}>
                                    <td>{row.date}</td>
                                    <td>{row.deliveries}</td>
                                    <td>{formatWeight(row.cargoWeight)} kg</td>
                                    <td>{formatWeight(row.payWeight)} kg</td>
                                    <td>{formatMoney(row.obligationAmount)} so'm</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="5">Hali yuk yozuvi yo'q.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="client-detail-panel">
                        <div className="panel-title">
                          <h2>Qancha pul berganmiz</h2>
                        </div>
                        <div className="client-table-wrap">
                          <table className="client-table">
                            <thead>
                              <tr>
                                <th>Sana</th>
                                <th>Summa</th>
                                <th>Izoh</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedClientPaymentHistory.length ? (
                                selectedClientPaymentHistory.map((row) => (
                                  <tr key={row.id}>
                                    <td>{row.date}</td>
                                    <td>{formatMoney(row.amount)} so'm</td>
                                    <td>{row.note || '-'}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="3">Hali to'lov yozuvi yo'q.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="client-list client-inline-list">
                      {clients.map((client) =>
                        client.id === editingClientId ? (
                          <form
                            className="client-edit-form"
                            key={client.id}
                            onSubmit={handleSaveClient}
                          >
                            <input
                              value={editingClientName}
                              onChange={(event) =>
                                setEditingClientName(event.target.value)
                              }
                            />
                            <input
                              value={editingClientPhone}
                              onChange={(event) =>
                                setEditingClientPhone(event.target.value)
                              }
                            />
                            <input
                              value={editingClientOpeningPayable}
                              onChange={(event) =>
                                setEditingClientOpeningPayable(
                                  formatNumberInput(event.target.value),
                                )
                              }
                              placeholder="Biz unga qarzmiz"
                            />
                            <input
                              value={editingClientOpeningReceivable}
                              onChange={(event) =>
                                setEditingClientOpeningReceivable(
                                  formatNumberInput(event.target.value),
                                )
                              }
                              placeholder="U bizga qarz"
                            />
                            <button className="save-button" type="submit">
                              Saqlash
                            </button>
                            <button
                              className="cancel-button"
                              type="button"
                              onClick={handleCancelEditClient}
                            >
                              Bekor qilish
                            </button>
                          </form>
                        ) : null,
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {activePage === 'factories' ? (
            <div className="factories-page">
              <div className="clients-toolbar">
                <div className="clients-title">
                  <h1>Zavod</h1>
                </div>
                <div className="clients-toolbar-actions">
                  <label className="mini-date-field">
                    Dan
                    <input
                      type="date"
                      value={factoryFilters.from}
                      onChange={(event) =>
                        setFactoryFilters((filters) => ({
                          ...filters,
                          from: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="mini-date-field">
                    Gacha
                    <input
                      type="date"
                      value={factoryFilters.to}
                      onChange={(event) =>
                        setFactoryFilters((filters) => ({
                          ...filters,
                          to: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="clients-add-button"
                    type="button"
                    onClick={() => {
                      setFactoryName('')
                      setFactoryModalOpen(true)
                    }}
                  >
                    Zavod yaratish
                  </button>
                </div>
              </div>

              <div className="client-summary-card">
                <div>
                  <span>Berishi kerak</span>
                  <strong>{formatMoney(totalFactoryObligationAmount)} so'm</strong>
                </div>
                <div>
                  <span>Bergan</span>
                  <strong>{formatMoney(totalFactoryPaidAmount)} so'm</strong>
                </div>
                <div>
                  <span>Qolgan pul</span>
                  <strong>{formatMoney(totalFactoryRemainingDebt)} so'm</strong>
                </div>
                <div>
                  <span>Jami sof kg</span>
                  <strong>{formatWeight(totalFactoryNetWeight)} kg</strong>
                </div>
              </div>

              <div className="client-table-wrap">
                <table className="client-table">
                  <thead>
                    <tr>
                      <th>Zavod</th>
                      <th>Jami yuk</th>
                      <th>Berishi kerak</th>
                      <th>Bergan</th>
                      <th>Qolgan</th>
                      <th>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factorySummaryRows.length ? (
                      factorySummaryRows.map((row) => (
                        <tr key={row.factory.id}>
                          <td data-label="Zavod">{row.factory.name}</td>
                          <td data-label="Jami yuk">
                            {formatWeight(row.netWeight)} kg / {row.deliveries} ta
                          </td>
                          <td data-label="Berishi kerak">
                            {formatMoney(row.obligationAmount)} so'm
                          </td>
                          <td data-label="Bergan">
                            {formatMoney(row.paidAmount)} so'm
                          </td>
                          <td data-label="Qolgan">
                            {formatMoney(row.remainingDebt)} so'm
                          </td>
                          <td data-label="Amal">
                            <div className="client-actions">
                              <button
                                className="view-button"
                                type="button"
                                onClick={() => handleOpenFactoryDetail(row.factory.id)}
                              >
                                Ko'rish
                              </button>
                              <button
                                className="edit-button"
                                type="button"
                                onClick={() => {
                                  handleStartEditFactory(row.factory)
                                  handleOpenFactoryDetail(row.factory.id)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="delete-button"
                                type="button"
                                onClick={() => handleDeleteFactory(row.factory.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">Tanlangan oraliqda zavod ma'lumoti topilmadi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {factoryModalOpen ? (
                <div className="modal-backdrop">
                  <form className="client-modal" onSubmit={handleCreateFactory}>
                    <div className="modal-head">
                      <h2>Zavod yaratish</h2>
                      <button
                        type="button"
                        onClick={() => setFactoryModalOpen(false)}
                      >
                        Yopish
                      </button>
                    </div>
                    <label>
                      Zavod nomi
                      <input
                        value={factoryName}
                        onChange={(event) => setFactoryName(event.target.value)}
                        placeholder="Nomi"
                        aria-label="Zavod nomi"
                      />
                    </label>
                    <label>
                      Biz unga qarzmiz
                      <input
                        inputMode="numeric"
                        value={factoryOpeningPayable}
                        onChange={(event) =>
                          setFactoryOpeningPayable(
                            formatNumberInput(event.target.value),
                          )
                        }
                        placeholder="Masalan 2 000 000"
                      />
                    </label>
                    <label>
                      U bizga qarz
                      <input
                        inputMode="numeric"
                        value={factoryOpeningReceivable}
                        onChange={(event) =>
                          setFactoryOpeningReceivable(
                            formatNumberInput(event.target.value),
                          )
                        }
                        placeholder="Masalan 5 000 000"
                      />
                    </label>
                    <button type="submit">Yaratish</button>
                  </form>
                </div>
              ) : null}

              {factoryDetailModalOpen && selectedFactory ? (
                <div className="modal-backdrop">
                  <div className="client-detail-modal">
                    <div className="modal-head">
                      <div>
                        <h2>{selectedFactory.name}</h2>
                        <p>Zavoddan tushadigan pul va yuk tarixi</p>
                      </div>
                      <div className="modal-head-actions">
                        <button
                          className="view-button"
                          type="button"
                          onClick={handleExportFactoryDetailToExcel}
                        >
                          Excelga yuklash
                        </button>
                        <button type="button" onClick={handleCloseFactoryDetail}>
                          Yopish
                        </button>
                      </div>
                    </div>

                    <div className="client-detail-stats">
                      <div>
                        <span>Boshlang'ich saldo</span>
                        <strong>{formatMoney(selectedFactoryOpeningBalance)} so'm</strong>
                      </div>
                      <div>
                        <span>Davr qarz</span>
                        <strong>{formatMoney(selectedFactoryObligationAmount)} so'm</strong>
                      </div>
                      <div>
                        <span>Davr to'lov</span>
                        <strong>{formatMoney(selectedFactoryPaidAmount)} so'm</strong>
                      </div>
                      <div>
                        <span>Yakuniy saldo</span>
                        <strong>{formatMoney(selectedFactoryRemainingDebt)} so'm</strong>
                      </div>
                    </div>

                    <div className="detail-filter-bar">
                      <label className="mini-date-field">
                        Dan
                        <input
                          type="date"
                          value={factoryFilters.from}
                          onChange={(event) =>
                            setFactoryFilters((filters) => ({
                              ...filters,
                              from: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="mini-date-field">
                        Gacha
                        <input
                          type="date"
                          value={factoryFilters.to}
                          onChange={(event) =>
                            setFactoryFilters((filters) => ({
                              ...filters,
                              to: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>

                    <form
                      className="client-payment-form factory-payment-form"
                      onSubmit={handleCreateFactoryPayment}
                    >
                      <label>
                        Sana
                        <input
                          type="date"
                          value={factoryPaymentDate}
                          onChange={(event) => {
                            setFactoryPaymentError('')
                            setFactoryPaymentDate(event.target.value)
                          }}
                        />
                      </label>
                      <label>
                        USD
                        <input
                          inputMode="numeric"
                          value={factoryPaymentUsd}
                          onChange={(event) => {
                            setFactoryPaymentError('')
                            setFactoryPaymentUsd(
                              formatNumberInput(event.target.value),
                            )
                          }}
                          placeholder="Masalan 2 000"
                        />
                      </label>
                      <label>
                        Kurs
                        <input
                          inputMode="numeric"
                          value={factoryPaymentRate}
                          onChange={(event) => {
                            setFactoryPaymentError('')
                            setFactoryPaymentRate(
                              formatNumberInput(event.target.value),
                            )
                            setFactoryPaymentAmount(
                              formatNumberInput(
                                String(
                                  parseNumber(factoryPaymentUsd) *
                                    parseNumber(event.target.value),
                                ),
                              ),
                            )
                          }}
                          placeholder="Masalan 12 050"
                        />
                      </label>
                      <label>
                        So'm
                        <input
                          value={formatNumberInput(String(factoryPaymentCalculatedAmount || ''))}
                          readOnly
                          placeholder="Avto hisoblanadi"
                        />
                      </label>
                      <label>
                        Qaysi yuk uchun
                        <input
                          value={factoryPaymentNote}
                          onChange={(event) => {
                            setFactoryPaymentError('')
                            setFactoryPaymentNote(event.target.value)
                          }}
                          placeholder="Masalan: 60D683QA yoki umumiy"
                        />
                      </label>
                      <button type="submit">To'lov qo'shish</button>
                    </form>

                    {factoryPaymentError ? (
                      <p className="expense-error">{factoryPaymentError}</p>
                    ) : null}

                    <div className="client-detail-grid">
                      <div className="client-detail-panel">
                        <div className="panel-title">
                          <h2>Qaysi kuni qaysi yukdan qancha pul qolgan</h2>
                        </div>
                        <div className="client-table-wrap">
                          <table className="client-table">
                            <thead>
                              <tr>
                                <th>Sana</th>
                                <th>Mashina</th>
                                <th>Sof kg</th>
                                <th>Bizning pul</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedFactoryOpeningPayable ||
                              selectedFactoryOpeningReceivable ? (
                                <tr>
                                  <td>Boshlang'ich</td>
                                  <td>-</td>
                                  <td>-</td>
                                  <td>
                                    {formatMoney(
                                      selectedFactoryOpeningBalance,
                                    )}{' '}
                                    so'm
                                  </td>
                                </tr>
                              ) : null}
                              {selectedFactoryCargoEntries.length ? (
                                selectedFactoryCargoEntries.map((row) => (
                                  <tr key={row.id}>
                                    <td>{row.date}</td>
                                    <td>{row.carNumber}</td>
                                    <td>{formatWeight(row.netWeight)} kg</td>
                                    <td>{formatMoney(row.totalAmount)} so'm</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4">Hali yuk yozuvi yo'q.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="client-detail-panel">
                        <div className="panel-title">
                          <h2>Zavod qanchasini bergan</h2>
                        </div>
                        <div className="client-table-wrap">
                          <table className="client-table">
                            <thead>
                              <tr>
                                <th>Sana</th>
                                <th>USD</th>
                                <th>Kurs</th>
                                <th>Summa</th>
                                <th>Izoh</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedFactoryPaymentHistory.length ? (
                                selectedFactoryPaymentHistory.map((row) => (
                                  <tr key={row.id}>
                                    <td>{row.date}</td>
                                    <td>
                                      {row.usdAmount
                                        ? `${formatMoney(row.usdAmount)} $`
                                        : '-'}
                                    </td>
                                    <td>
                                      {row.exchangeRate
                                        ? formatMoney(row.exchangeRate)
                                        : '-'}
                                    </td>
                                    <td>{formatMoney(row.amount)} so'm</td>
                                    <td>{row.note || '-'}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="5">Hali to'lov yozuvi yo'q.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="client-list client-inline-list">
                      {factories.map((factory) =>
                        factory.id === editingFactoryId ? (
                          <form
                            className="factory-edit-form"
                            key={factory.id}
                            onSubmit={handleSaveFactory}
                          >
                            <input
                              value={editingFactoryName}
                              onChange={(event) =>
                                setEditingFactoryName(event.target.value)
                              }
                            />
                            <input
                              value={editingFactoryOpeningPayable}
                              onChange={(event) =>
                                setEditingFactoryOpeningPayable(
                                  formatNumberInput(event.target.value),
                                )
                              }
                              placeholder="Biz unga qarzmiz"
                            />
                            <input
                              value={editingFactoryOpeningReceivable}
                              onChange={(event) =>
                                setEditingFactoryOpeningReceivable(
                                  formatNumberInput(event.target.value),
                                )
                              }
                              placeholder="U bizga qarz"
                            />
                            <button className="save-button" type="submit">
                              Saqlash
                            </button>
                            <button
                              className="cancel-button"
                              type="button"
                              onClick={handleCancelEditFactory}
                            >
                              Bekor qilish
                            </button>
                          </form>
                        ) : null,
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {activePage === 'expenses' ? (
            <div className="expenses-page">
              <div className="page-heading">
                <h1>Xarajatlar</h1>
                <p>Xarajat summasi va sababini kiriting.</p>
              </div>

              <div className="expense-toolbar">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseError('')
                    setEditingExpenseId(null)
                    setExpenseDate('')
                    setExpenseAmount('')
                    setExpenseReason('')
                    setExpenseModalOpen(true)
                  }}
                >
                  Xarajat qo'shish
                </button>
              </div>

              <div className="expense-list">
                {expenses.length ? (
                  expenses.map((expense) => (
                    <div className="expense-item" key={expense.id}>
                      <div className="expense-info">
                        <strong>{formatMoney(expense.amount)} so'm</strong>
                        <span>{expense.date || 'Sanasiz'}</span>
                        <span>{expense.reason}</span>
                      </div>
                      <div className="expense-actions">
                        <button
                          className="edit-button"
                          type="button"
                          onClick={() => handleEditExpense(expense)}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          type="button"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">Hali xarajat kiritilmagan.</p>
                )}
              </div>

              {expenseModalOpen ? (
                <div className="modal-backdrop">
                  <form className="expense-modal" onSubmit={handleCreateExpense}>
                    <div className="modal-head">
                      <h2>
                        {editingExpenseId ? 'Xarajatni tahrirlash' : "Xarajat qo'shish"}
                      </h2>
                      <button
                        type="button"
                        onClick={handleCloseExpenseModal}
                      >
                        Yopish
                      </button>
                    </div>
                    <label>
                      Xarajat sanasi
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(event) => {
                          setExpenseError('')
                          setExpenseDate(event.target.value)
                        }}
                      />
                    </label>
                    <label>
                      Xarajat summasi
                      <input
                        inputMode="numeric"
                        value={expenseAmount}
                        onChange={(event) => {
                          setExpenseError('')
                          setExpenseAmount(formatNumberInput(event.target.value))
                        }}
                        placeholder="Xarajat summasi"
                      />
                    </label>
                    <label>
                      Xarajat sababi
                      <input
                        value={expenseReason}
                        onChange={(event) => {
                          setExpenseError('')
                          setExpenseReason(event.target.value)
                        }}
                        placeholder="Xarajat sababi"
                      />
                    </label>
                    {expenseError ? (
                      <p className="expense-error">{expenseError}</p>
                    ) : null}
                    <button type="submit">
                      {editingExpenseId ? 'Saqlash' : 'Yaratish'}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : null}

          {activePage === 'cargo-delivery' ? (
            <div className="cargo-page">
              <div className="today-summary">
                <div>
                  <span>{summaryKgLabel}</span>
                  <strong>{formatWeight(summaryTotalKg)} kg</strong>
                </div>
                <div>
                  <span>{summaryAmountLabel}</span>
                  <strong>{formatMoney(summaryTotalAmount)} so'm</strong>
                </div>
                <div>
                  <span>Kunlik rasxod</span>
                  <strong>{formatMoney(summaryDailyExpense)} so'm</strong>
                </div>
                <div>
                  <span>{summaryProfitLabel}</span>
                  <strong>{formatMoney(summaryNetProfitAmount)} so'm</strong>
                </div>
              </div>

              <div className="table-toolbar">
                <label className="mini-date-field">
                  Dan
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
                <label className="mini-date-field">
                  Gacha
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
                <label className="daily-expense-field">
                  Kunlik rasxod
                  <input
                    inputMode="numeric"
                    value={dailyExpenseInput}
                    onBlur={saveDailyExpense}
                    onChange={(event) => {
                      setDailyExpenseError('')
                      setDailyExpenseEditing(true)
                      setDailyExpenseInput(formatNumberInput(event.target.value))
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                    }}
                    placeholder="Rasxod"
                    disabled={!canEditDailyExpense || dailyExpenseSaving}
                  />
                </label>
                <button
                  className="daily-expense-submit"
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={saveDailyExpense}
                  disabled={!canEditDailyExpense || dailyExpenseSaving}
                >
                  {dailyExpenseSaving ? 'Saqlanmoqda...' : 'Kiritish'}
                </button>
                {dailyExpenseError ? (
                  <p className="daily-expense-error">{dailyExpenseError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleExportCargoToExcel}
                  disabled={!displayedCargoEntries.length}
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
                  Klent
                  <select
                    value={cargoForm.clientId}
                    onChange={(event) =>
                      updateCargoField('clientId', event.target.value)
                    }
                  >
                    <option value="">Klent tanlang</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Zavod
                  <select
                    value={cargoForm.factoryId}
                    onChange={(event) =>
                      updateCargoField('factoryId', event.target.value)
                    }
                  >
                    <option value="">Zavod tanlang</option>
                    {factories.map((factory) => (
                      <option key={factory.id} value={factory.id}>
                        {factory.name}
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

                <label>
                  Skidka
                  <input
                    inputMode="decimal"
                    value={cargoForm.discountWeight}
                    onChange={(event) =>
                      updateCargoField('discountWeight', event.target.value)
                    }
                    placeholder="Skidka"
                  />
                </label>

                <label>
                  Yolkira
                  <input
                    inputMode="numeric"
                    value={cargoForm.transportCost}
                    onChange={(event) =>
                      updateCargoField(
                        'transportCost',
                        formatNumberInput(event.target.value),
                      )
                    }
                    placeholder="Yolkira"
                  />
                </label>

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

                <label>
                  Klent narxi
                  <input
                    inputMode="numeric"
                    value={cargoForm.clientPricePerKg}
                    onChange={(event) =>
                      updateCargoField('clientPricePerKg', event.target.value)
                    }
                    placeholder="Klent narxi"
                  />
                </label>

                <label>
                  Klent hisob turi
                  <select
                    value={cargoForm.clientWeightMode}
                    onChange={(event) =>
                      updateCargoField('clientWeightMode', event.target.value)
                    }
                  >
                    <option value="cargo">Qolgan yuki bo'yicha</option>
                    <option value="net">Qolgan vazn bo'yicha</option>
                  </select>
                </label>

                <div className="amount-box">
                  <span>Aniq summa</span>
                  <strong>{formatMoney(totalAmount)} so'm</strong>
                </div>

                <div className="calculated-field">
                  <span>To'lov kg</span>
                  <strong>{formatWeight(clientPayWeight)} kg</strong>
                </div>

                <div className="calculated-field">
                  <span>Klentga to'lov</span>
                  <strong>{formatMoney(clientTotalAmount)} so'm</strong>
                </div>

                <div className="amount-box profit-box">
                  <span>Foyda</span>
                  <strong>{formatMoney(profitAmount)} so'm</strong>
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

                {cargoError ? (
                  <p className="cargo-error">{cargoError}</p>
                ) : null}
              </form>

              <div className="cargo-table-wrap">
                <table className="cargo-table">
                  <thead>
                    <tr>
                      <th>Sana</th>
                      <th>Mashina</th>
                      <th>Klent</th>
                      <th>Zavod</th>
                      <th>To'la</th>
                      <th>Yuksiz</th>
                      <th>Yuk</th>
                      <th>Skidka</th>
                      <th>Yolkira</th>
                      <th>Qolgan</th>
                      <th>To'lov kg</th>
                      <th>Narx</th>
                      <th>Klent narxi</th>
                      <th>Klentga to'lov</th>
                      <th>Summa</th>
                      <th>Foyda</th>
                      <th>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCargoEntries.length ? (
                      displayedCargoEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td data-label="Sana">{entry.date}</td>
                          <td data-label="Mashina">{entry.carNumber}</td>
                          <td data-label="Klent">{entry.clientName || '-'}</td>
                          <td data-label="Zavod">{entry.factoryName || '-'}</td>
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
                          <td data-label="Yolkira">
                            {formatMoney(entry.transportCost || 0)} so'm
                          </td>
                          <td className="net-cell" data-label="Qolgan">
                            {formatWeight(entry.netWeight)}
                          </td>
                          <td data-label="To'lov kg">
                            {formatWeight(entry.clientPayWeight || entry.cargoWeight)}
                          </td>
                          <td className="price-cell" data-label="Narx">
                            {formatMoney(entry.pricePerKg)}
                          </td>
                          <td data-label="Klent narxi">
                            {formatMoney(entry.clientPricePerKg || 0)}
                          </td>
                          <td data-label="Klentga to'lov">
                            {formatMoney(entry.clientTotalAmount || 0)} so'm
                          </td>
                          <td data-label="Summa">
                            {formatMoney(entry.totalAmount)} so'm
                          </td>
                          <td data-label="Foyda">
                            {formatMoney(entry.profitAmount || 0)} so'm
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
                        <td colSpan="17">Hali yuk topshirish yozilmagan.</td>
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
