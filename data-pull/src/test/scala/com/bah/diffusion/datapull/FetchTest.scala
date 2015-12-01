package com.bah.diffusion.datapull

import org.junit.AfterClass
import org.junit.BeforeClass
import org.junit.Test


class FetchTest {
  @Test
  def testFetch(){
    Fetch.fetch(Array("./../resources/ACS_variables.json"))
  }
}