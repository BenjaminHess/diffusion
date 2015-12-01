package com.bah.diffusion.dataingest

import org.apache.accumulo.minicluster.MiniAccumuloCluster
import org.apache.accumulo.minicluster.MiniAccumuloConfig
import com.google.common.io.Files
import org.junit.AfterClass
import org.junit.BeforeClass
import org.junit.Test
import org.junit.Ignore
import com.bah.diffusion.testutils._
import org.apache.accumulo.core.client.Scanner
import org.apache.accumulo.core.data.Range

/**
 * @author alex
 */
class ACSIngestTest {
    
  @Ignore
  def testACS(){
    
    val scanner:Scanner = ACSIngestTest.accTestServer.getRootConnector.createScanner("ACS", ACSIngestTest.accTestServer.getSetAuths)
    val it = scanner.iterator
    assert(it.hasNext)
    AccumuloTestServer.printData(scanner)
    scanner.close
  }
  
  @Ignore
  def testWaitForOneHour(){
    println("For One Hour")
    var loop = 0
    while(loop.<(60)) {
      Thread.sleep(1000 * 60)
      println("waiting")
      loop.+=(1)
    }
    println("Must issue ^C in Console window to stop loop before one hour")
  }
  
  @Test
  def testWalkEarningScan(){
    //"concept": "B08119.  Means of Transportation to Work by Workers' Earnings",
    //"label": "Walked:!!$1 to $9,999 or loss",
    println("Scan: Means of Transportation;Walked:!!$1 to $9,999 or loss")
    
    val scanner:Scanner = ACSIngestTest.accTestServer.getRootConnector.createScanner("ACS", ACSIngestTest.accTestServer.getSetAuths)
    scanner.setRange(new Range("B08119_038E_","B08119_038E_51_999"));
    val it = scanner.iterator
    assert(it.hasNext)
    AccumuloTestServer.printData(scanner)
    scanner.close
    println("End Scan")
  }
  
}

object ACSIngestTest {
  var accTestServer: AccumuloTestServer = null
  
  @BeforeClass
  def start() {
    accTestServer = AccumuloTestServer.createAndStartMiniCluster()
    
    ACSIngestTest.accTestServer.createTable("ACS")
    ACSIngest.configure("root", AccumuloTestServer.DEFAULT_PASSWORD,
        AccumuloTestServer.DEFAULT_AUTHS, ACSIngestTest.accTestServer.getInstance().getInstanceName,
        ACSIngestTest.accTestServer.getInstance().getZooKeepers)
    ACSIngest.ingest(List("./../resources/ACS_FullData/Data_1418143110661.txt"), "ACS")
    
  }

  @AfterClass
  def tearDown() {
    accTestServer.shutDown()
  }
  
}