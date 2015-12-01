package com.bah.diffusion.dataingest

import org.junit.Test
import org.junit.Ignore

class EsPullTest {

    @Ignore
    def testSearch() {
        EsPull.varSearch()
    }
    
    @Test
    def testFetch(){
      //State is 51 for VA
      //EsPull.fetch(Array("./../resources/ACS_variables.json","51"))
      //State is 24 for MD
      //EsPull.fetch(Array("./../resources/ACS_variables.json","24"))
      //Testing with sample
      EsPull.fetch(Array("./../resources/sampleACS_variables.json","24"))
    }
    
}