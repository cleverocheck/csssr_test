import React from 'react'
import ReactDOM from 'react-dom'

// Slomux - реализация Flux, в которой, как следует из названия, что-то сломано.
// Нужно починить то, что сломано, и подготовить Slomux к использованию на больших проектах, где крайне важна производительность.
// ВНИМАНИЕ! Замена slomux на готовое решение не является решением задачи - ознакомлен.

// ! initialState шел напрямую в state, без вызова reducer. 
// ! По концепции паттерна наблюдателя изменять state следует только результатом работы функции reducer. 
// ! Кроме того такой сразу переместит иницилизацию стейта в сам reducer и иницилизация state станет action.

const createStore = (reducer, initialState) => {
  // * моё условное обозначение action на иницилизацию state, просто нужно не занимать такой action вручную и все (даже, например, в redux есть такой зарезервированный action), поэтому он имеет спецефичное название 
  let state = reducer(initialState, { type: '@SLOMUX_INIT' })
  const subscribers = []

  const dispatch = action => {
    state = reducer(state, action)
    subscribers.forEach(callback => callback())
  }
  const subscribe = callback => subscribers.push(callback)
  const getState = () => state

  return { dispatch, subscribe, getState }
}

// * React контекст для хранения в нем store
let Context = React.createContext(null)

// ? Я думаю нет смысла принимать context для Provider от пользователя библиотеки.
// ? Тк это может быть даже опасно, тк можно передать не context, обнулить его тем самым сломав наш slomux (этого еще ему не хватало xD).
// ? Поэтому просто стоит создавать свой приватный контекст прямо при создании провайдера и не давать его пользователю библиотеки.
// ! По какой-то причине тут store занесен в объект, полностью бесполезное действие, которое просто делает дополнительную вложенность, легче сразу просто передать в value сам непосредственно store.

const Provider = ({ store, children }) => {
  return <Context.Provider value={store}>{children}</Context.Provider>
}

// ! В этом коде всегда возращался 0, тк нужно передавать в хук useContext нужно НЕ новый пустой контекст, а контекст со store.
// ! Cоотвественно уберем запись с возратом нуля (она попросту бесполезна и не интуитивна для пользователя библиотеки).
// ! Кроме того здесь возращается просто уже вызванная функция selector (переименовал в callback) что категорически не правильно, тк нет в таком случае нет никакой подписки на state, а в этом и заключается весь смысл useSelector.
// ! Кроме того я убрал бесполезную обертку в виде value = {{store}}, соотвественно нужно обращаться не к ctx.store['key'], а сразу с ctx['key'] 
// * Тут я просто реализовал возращение вызванного каллбека с локальным react стейтом при вызове хука и при изменение localState (а он в свою очередь меняется по подписке на store)

const useSelector = callback => {
  const localStore = React.useContext(Context)
  const [localState, setLocalState] = React.useState(localStore.getState())

  localStore.subscribe(() => {
    setLocalState(localStore.getState())
  })

  return callback(localState)
}

// ! В этом случае тоже всегда возращалась нулевая функция, тк нужно передавать в хук useContext нужно НЕ новый пустой контекст, а контекст со store.
// ! Cоотвественно уберем запись с возратом нулевой функции (она попросту бесполезна и не интуитивна для пользователя библиотеки).
// * в итоге просто функция возращает dispatch от store

const useDispatch = () => {
  const localStore = React.useContext(Context)
  return localStore.dispatch
}

// ------------------------

// actions в переменных, чтобы не хардкодить
const UPDATE_COUNTER = 'UPDATE_COUNTER'
const CHANGE_STEP_SIZE = 'CHANGE_STEP_SIZE'

// action creators
const updateCounter = value => ({
  type: UPDATE_COUNTER,
  payload: value,
})

const changeStepSize = value => ({
  type: CHANGE_STEP_SIZE,
  payload: value,
})

// reducer с initialState
const initialState = {
  counter: 1,
  stepSize: 1
}

// ! Бесполезный код - default: {}. Тут вероятнее подрузомевалось default: return {}, но при такой записи если обратиться к dispatch с type, который не будет занесен в switch/case то состояние всего приложения просто слетит к {}.
// ! Что разумеется очень плохо, по default: нужно возращать состояние state без изменения (return state).
// ! Также была серьезная ошибка с изменением state напрямую state.stepSize='any_value' и state.counter='any_value', по концепции паттерна наблюдателя изменять state следует только результатом работы функции reducer. 
// ! Поэтому нужно просто вернуть тут копию объекта state с определенным измененным значением (return {...state, stepSize: 'any_value'}/return {...state, counter: 'any_value'}).
// ! Также у caseов не был прописан break и соотвественно выполнялся весь код, но в моей правке на строку выше break прописывать нет смысла, тк return сразу завершит выполнение функции.

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case UPDATE_COUNTER:
      return {
        ...state,
        counter: state.counter + action.payload
      }
    case CHANGE_STEP_SIZE:
      return {
        ...state,
        stepSize: action.payload
      }
    default:
      return state
  }
}

// ВНИМАНИЕ! Использование собственной реализации useSelector и dispatch обязательно - ознакомлен.

const Counter = () => {
  const counter = useSelector(({ counter }) => counter)
  const dispatch = useDispatch()

  return (
    <div>
      <button onClick={() => dispatch(updateCounter(-1))}>-</button>
      <span> {counter} </span>
      <button onClick={() => dispatch(updateCounter(1))}>+</button>
    </div>
  )
}

const Step = () => {
  // ! даже написанный самими вами useSeletor принимает в себя один аргумент, а тут зачем-то еще второй, уберем его
  const stepSize = useSelector(({ stepSize }) => stepSize)
  const dispatch = useDispatch()

  return (
    <div>
      <div>Значение счётчика должно увеличиваться или уменьшаться на заданную величину шага</div>
      <div>Текущая величина шага: {stepSize}</div>
      <input
        type="range"
        min="1"
        max="5"
        value={stepSize}
        // ? желательно привести значение к числу, чтобы просто более логичое в итоге было состояние
        onChange={({ target }) => dispatch(changeStepSize(+target.value))}
      />
    </div>
  )
}

ReactDOM.render(
  <Provider store={createStore(reducer, initialState)}>
    <Step />
    <Counter />
  </Provider>,
  document.getElementById('app')
)
