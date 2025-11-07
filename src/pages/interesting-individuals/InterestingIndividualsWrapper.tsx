import { useState } from 'react'
import InterestingIndividuals from './InterestingIndividuals'

const InterestingIndividualsWrapper = () => {
  const [filterTerm, setFilterTerm] = useState('')

  const handleIndividualFilterChange = (newFilterTerm: string) => {
    setFilterTerm(newFilterTerm)
  }

  return (
    <InterestingIndividuals 
      filterTerm={filterTerm}
      onIndividualFilterChange={handleIndividualFilterChange}
    />
  )
}

export default InterestingIndividualsWrapper