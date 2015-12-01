package com.bah.diffusion.dataingest

import org.junit.Test

class CSVFormatPullTest {

   @Test
    def testFetch(){
      //State is 51 for VA
      //EsPull.fetch(Array("./../resources/ACS_variables.json","51"))
      //State is 24 for MD
      CSVFormatPull.fetch(Array("./../resources/sampleACS_variables.json","24"))
    }
  
}