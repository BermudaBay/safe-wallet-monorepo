import { useCallback, useState } from 'react'

const useTxStepper = <T extends unknown>(initialData: T) => {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<T>(initialData)

  const nextStep = useCallback((entireData?: T) => {
    if (entireData) setData(entireData)

    setStep((prevStep) => {
      return prevStep + 1
    })
  }, [])

  const prevStep = useCallback(() => {
    setStep((prevStep) => {
      return prevStep - 1
    })
  }, [])

  return { step, data, nextStep, prevStep }
}

export default useTxStepper
