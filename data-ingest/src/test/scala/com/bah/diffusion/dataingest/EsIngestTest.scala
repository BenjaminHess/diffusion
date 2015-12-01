package com.bah.diffusion.dataingest

import org.junit.Test
import org.junit.Ignore

class EsIngestTest {

  @Test
  def testIngest(){
    EsIngest.ingest("./../resources/Data-sample.txt")
  }
}